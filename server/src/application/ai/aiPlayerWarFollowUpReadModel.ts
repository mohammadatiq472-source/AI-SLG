import type { AiPlayerActionType, AiPlayerBattleReportReadItem } from '../../../../shared/contracts/aiPlayer'

export type AiPlayerWarFollowUpReadModel = {
  action: AiPlayerActionType
  args: Record<string, unknown>
  readiness: 'ready' | 'needs_target' | 'blocked' | 'information_only'
  reason: string
}

export function buildAiPlayerWarBattleFollowUp(params: {
  battle: AiPlayerBattleReportReadItem
  unitId: string
  targetTileId: string
  cityCaptured?: boolean
}): AiPlayerWarFollowUpReadModel {
  if (params.battle.reportKind === 'city_siege') {
    if (params.cityCaptured) {
      return {
        action: 'battle_report_read',
        args: { reportId: params.battle.reportId },
        readiness: 'ready',
        reason: '攻城已经破城，占领结果已写入城池状态；下一步先复盘战报，再决定驻防或继续推进。',
      }
    }
    return {
      action: 'city_siege',
      args: {
        unitId: params.unitId,
        targetTileId: params.targetTileId,
      },
      readiness: 'ready',
      reason: '攻城尚未破城，目标城池仍有耐久；可继续对同一城池发起攻城。',
    }
  }
  if (params.battle.outcome === 'loss' || params.battle.severity === 'high') {
    return {
      action: 'troop_heal',
      args: { unitId: params.unitId },
      readiness: 'ready',
      reason: '战斗损失偏高，先整补补兵或驻防，避免继续推进。',
    }
  }
  return {
    action: 'battle_report_read',
    args: { reportId: params.battle.reportId },
    readiness: 'information_only',
    reason: '战斗结果可继续复盘，确认周边风险后再决定下一步。',
  }
}
