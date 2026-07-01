import type {
  AiPlayerActionReceipt,
  AiPlayerActionType,
  AiPlayerAutonomousPersonalReport,
  AiPlayerExecutionTraceItem,
  AiPlayerExecutionTraceMarker,
  AiPlayerExecutionTracePhase,
  AiPlayerExecutionTraceResponse,
  AiPlayerExecutionTraceSourceKind,
} from '../../../../shared/contracts/aiPlayer'
import { getGovernedAiPlayerRuntime, listAiPlayerActionReceipts } from './AIPlayerGovernanceService'
import { listStaticAiPlayerActionCatalog } from './aiPlayerActionCatalog'
import { listAiPlayerAutonomousPersonalReports } from './aiPlayerAutonomousDevelopmentService'

const PLAYER_TASK_LABELS: Partial<Record<AiPlayerActionType, string>> = {
  resource_gather: '采集资源',
  tile_occupy: '占领地块',
  march_move: '行军推进',
  troop_heal: '整补部队',
  troop_train: '补充兵力',
  building_upgrade: '升级内政建筑',
  tactical_skill_upgrade: '升级战法',
  city_siege: '攻城行动',
  garrison_set: '布置驻防',
  alliance_defense_assign: '安排同盟驻防',
  alliance_defense_batch_assign: '批量安排同盟驻防',
  rally_launch: '发起集结',
  rally_join: '加入集结',
  world_scout: '侦察目标',
  next_step_propose: '暂缓行动',
}

const actionCatalogLabels = new Map(
  listStaticAiPlayerActionCatalog().map((entry) => [entry.action, entry.label] as const),
)

function normalizeLimit(limit: number) {
  return Math.max(1, Math.min(200, Math.trunc(Number(limit) || 20)))
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : ''
}

function sourceKindFromReport(report: AiPlayerAutonomousPersonalReport): AiPlayerExecutionTraceSourceKind {
  return report.category === 'combat' ? 'autonomous_combat' : 'autonomous_development'
}

function phaseFromReport(
  report: AiPlayerAutonomousPersonalReport,
  receipt?: AiPlayerActionReceipt,
): AiPlayerExecutionTracePhase {
  if (report.action === 'next_step_propose') {
    return 'skipped'
  }
  if (receipt?.ok === false) {
    return 'failed'
  }
  return 'completed'
}

function phaseFromReceipt(receipt: AiPlayerActionReceipt): AiPlayerExecutionTracePhase {
  return receipt.ok ? 'completed' : 'failed'
}

function taskLabelForAction(action: AiPlayerActionType) {
  return PLAYER_TASK_LABELS[action] ?? actionCatalogLabels.get(action) ?? action
}

function currentTaskText(action: AiPlayerActionType, phase: AiPlayerExecutionTracePhase) {
  const label = taskLabelForAction(action)
  switch (phase) {
    case 'failed':
      return `未完成：${label}`
    case 'skipped':
      return `暂缓：${label}`
    case 'completed':
    default:
      return `已完成：${label}`
  }
}

function targetTileIdFromReceipt(receipt?: AiPlayerActionReceipt) {
  if (!receipt?.worldActionPayload) {
    return ''
  }
  return readString(receipt.worldActionPayload.tileId)
    || readString(receipt.worldActionPayload.targetTileId)
    || readString(receipt.worldActionPayload.cityTileId)
}

function unitIdFromReceipt(receipt?: AiPlayerActionReceipt) {
  if (!receipt?.worldActionPayload) {
    return ''
  }
  return readString(receipt.worldActionPayload.unitId)
}

function markerFromTrace(
  action: AiPlayerActionType,
  phase: AiPlayerExecutionTracePhase,
  targetTileId: string,
): AiPlayerExecutionTraceMarker | undefined {
  if (!targetTileId) {
    return undefined
  }
  return {
    kind: phase,
    tileId: targetTileId,
    label: taskLabelForAction(action),
  }
}

function buildTraceItem(
  report: AiPlayerAutonomousPersonalReport,
  receiptByProposalId: Map<string, AiPlayerActionReceipt>,
): AiPlayerExecutionTraceItem {
  const receipt = receiptByProposalId.get(report.relatedReceiptProposalId)
    ?? receiptByProposalId.get(report.relatedProposalId)
  const phase = phaseFromReport(report, receipt)
  const targetTileId = targetTileIdFromReceipt(receipt)
  const unitId = unitIdFromReceipt(receipt)
  const marker = markerFromTrace(report.action, phase, targetTileId)
  return {
    traceId: `trace_${report.reportId}`,
    visibility: 'player',
    aiPlayerId: report.aiPlayerId,
    ownerPlayerId: report.ownerPlayerId,
    factionId: report.factionId,
    sourceKind: sourceKindFromReport(report),
    phase,
    action: report.action,
    title: report.title,
    summary: report.summary,
    result: report.result,
    currentTaskText: currentTaskText(report.action, phase),
    createdAt: report.createdAt,
    reportId: report.reportId,
    ...(unitId ? { unitId } : {}),
    ...(targetTileId ? { targetTileId } : {}),
    ...(marker ? { marker } : {}),
  }
}

function messageFromReceipt(receipt: AiPlayerActionReceipt, phase: AiPlayerExecutionTracePhase) {
  const message = readString(receipt.message)
  if (message) {
    return message
  }
  const label = taskLabelForAction(receipt.action)
  return phase === 'completed'
    ? `${label} 已完成，结果已写入后端回执。`
    : `${label} 未完成，原因已写入后端回执。`
}

function buildTraceItemFromReceipt(receipt: AiPlayerActionReceipt): AiPlayerExecutionTraceItem {
  const phase = phaseFromReceipt(receipt)
  const targetTileId = targetTileIdFromReceipt(receipt)
  const unitId = unitIdFromReceipt(receipt)
  const marker = markerFromTrace(receipt.action, phase, targetTileId)
  const title = taskLabelForAction(receipt.action)
  const summary = messageFromReceipt(receipt, phase)
  return {
    traceId: `trace_receipt_${receipt.proposalId}`,
    visibility: 'player',
    aiPlayerId: receipt.aiPlayerId,
    ownerPlayerId: receipt.governorPlayerId,
    factionId: receipt.factionId,
    sourceKind: 'governed_proposal',
    phase,
    action: receipt.action,
    title,
    summary,
    result: summary,
    currentTaskText: currentTaskText(receipt.action, phase),
    createdAt: receipt.observedAt,
    reportId: `receipt_${receipt.proposalId}`,
    ...(unitId ? { unitId } : {}),
    ...(targetTileId ? { targetTileId } : {}),
    ...(marker ? { marker } : {}),
  }
}

export function listAiPlayerExecutionTrace(
  aiPlayerId: string,
  limit = 20,
): AiPlayerExecutionTraceResponse {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    return { ok: false, error: `ai player not found: ${aiPlayerId}` }
  }

  const normalizedLimit = normalizeLimit(limit)
  const reports = listAiPlayerAutonomousPersonalReports(aiPlayerId, normalizedLimit)
  const receipts = listAiPlayerActionReceipts(aiPlayerId, Math.max(normalizedLimit * 4, 20))
  const receiptByProposalId = new Map(receipts.map((receipt) => [receipt.proposalId, receipt] as const))
  const reportReceiptProposalIds = new Set(
    reports.flatMap((report) => [report.relatedReceiptProposalId, report.relatedProposalId]),
  )
  const reportItems = reports.map((report) => buildTraceItem(report, receiptByProposalId))
  const receiptItems = receipts
    .filter((receipt) => !reportReceiptProposalIds.has(receipt.proposalId))
    .map((receipt) => buildTraceItemFromReceipt(receipt))
  const items = [...reportItems, ...receiptItems]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, normalizedLimit)
  return {
    ok: true,
    aiPlayerId,
    ownerPlayerId: runtime.governorPlayerId,
    items,
    count: items.length,
  }
}
