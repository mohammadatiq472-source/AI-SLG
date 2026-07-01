import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildBattleReplayScreenReadModel,
  buildCivilMemoryHistoryCards,
  buildPlayerSaveLoadReadModel,
  buildPlayerWorldTimelineReadModel,
} from '../../shared/domain/playerHistory'
import type { CivilMemoryEntry } from '../../shared/contracts/civilMemory'
import type { ExecutionReplay, SaveSlotRecord, WorldEventRecord } from '../../shared/contracts/game'

const historyAuthority = readFileSync('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md', 'utf8')

const worldEvents: WorldEventRecord[] = [
  {
    id: 'event-1',
    category: 'world_action',
    action: 'POST /api/world/action debug_raw_event',
    success: true,
    tick: 12,
    worldVersion: 44,
    createdAt: '2026-06-11T10:00:00.000Z',
    requestId: 'req-1',
    message: '前线据点已经易手',
    metadata: {
      actorName: '北军',
      apiPath: '/api/world/action',
      memoryProvider: 'mem0',
    },
  },
  {
    id: 'event-2',
    category: 'planning',
    action: 'internal_planner_tick',
    success: false,
    tick: 13,
    worldVersion: 45,
    createdAt: '2026-06-11T10:03:00.000Z',
    message: 'AI 行动需要重新评估',
    metadata: {
      factionId: 'faction-a',
      rawEventType: 'planner_debug',
    },
  },
  {
    id: 'event-court',
    category: 'world_action',
    action: 'court_resolution_apply_internal',
    success: true,
    tick: 16,
    worldVersion: 47,
    createdAt: '2026-06-11T10:12:00.000Z',
    message: '朝议结果已进入执行',
    metadata: {
      playerHistoryCategory: 'court',
      playerHistoryActorName: '朝议席',
      playerHistoryTitle: '朝议决议进入执行',
      playerHistorySummary: '洛阳增援获得多数支持',
      playerHistoryLocation: '洛阳',
      playerHistoryTarget: '北线增援',
      playerHistoryResultLabel: '待执行',
      playerHistoryConsequence: '将影响前线调度',
      playerHistoryNextAction: '查看决议',
      playerHistorySeverity: 'medium',
      routeName: '/api/court/debug',
      rawEventType: 'court_backend_resolution',
    },
  },
  {
    id: 'event-diplomacy',
    category: 'world_action',
    action: 'diplomacy_relation_internal',
    success: true,
    tick: 17,
    worldVersion: 48,
    createdAt: '2026-06-11T10:13:00.000Z',
    message: '外交回应已经送达',
    metadata: {
      playerHistoryCategory: 'diplomacy',
      playerHistoryActorName: '青徐同盟',
      playerHistoryTitle: '停战回应送达',
      playerHistorySummary: '对方接受三回合停战',
      playerHistoryTarget: '兖州同盟',
      playerHistoryResultLabel: '关系缓和',
      playerHistoryConsequence: '边境压力下降',
      playerHistoryNextAction: '安排换防',
      playerHistorySeverity: 'medium',
      memoryProvider: 'mem0',
    },
  },
  {
    id: 'event-economy',
    category: 'world_action',
    action: 'city_tax_tick_internal',
    success: true,
    tick: 18,
    worldVersion: 49,
    createdAt: '2026-06-11T10:14:00.000Z',
    message: '城池收入已经结算',
    metadata: {
      playerHistoryCategory: 'economy_city',
      playerHistoryActorName: '陈留太守',
      playerHistoryTitle: '粮税入库',
      playerHistorySummary: '陈留本轮粮税增加',
      playerHistoryLocation: '陈留',
      playerHistoryResultLabel: '收入增加',
      playerHistoryConsequence: '仓储压力上升',
      playerHistoryNextAction: '安排转运',
      playerHistorySeverity: 'low',
    },
  },
  {
    id: 'event-organization',
    category: 'planning',
    action: 'organization_objective_internal',
    success: true,
    tick: 19,
    worldVersion: 50,
    createdAt: '2026-06-11T10:15:00.000Z',
    message: '同盟目标已经更新',
    metadata: {
      playerHistoryCategory: 'organization_nation',
      playerHistoryActorName: '北军同盟',
      playerHistoryTitle: '同盟目标推进',
      playerHistorySummary: '洛阳方向目标进度提高',
      playerHistoryTarget: '洛阳',
      playerHistoryResultLabel: '进度提高',
      playerHistoryConsequence: '成员获得新指令',
      playerHistoryNextAction: '查看同盟目标',
      playerHistorySeverity: 'medium',
    },
  },
  {
    id: 'event-ai',
    category: 'planning',
    action: 'ai_governed_action_receipt_internal',
    success: false,
    tick: 20,
    worldVersion: 51,
    createdAt: '2026-06-11T10:16:00.000Z',
    message: 'AI 行动等待确认',
    metadata: {
      playerHistoryCategory: 'ai_activity',
      playerHistoryActorName: '军师 AI',
      playerHistoryTitle: 'AI 提案需要确认',
      playerHistorySummary: '前线补给方案需要玩家批准',
      playerHistoryTarget: '补给线',
      playerHistoryResultLabel: '等待确认',
      playerHistoryConsequence: '暂不改变世界状态',
      playerHistoryNextAction: '处理提案',
      playerHistorySeverity: 'high',
      apiPath: '/api/ai/debug',
    },
  },
]

const civilMemoryEntries: CivilMemoryEntry[] = [
  {
    id: 'civil-1',
    tick: 14,
    type: 'court_resolution',
    title: '同盟决议通过',
    summary: '洛阳方向增援方案已生效',
    relatedIds: ['proposal-1'],
    factionIds: ['alliance-a'],
    resolutionId: 'resolution-1',
    outcome: 'success',
    responsibilities: [],
    metadata: {
      memoryProvider: 'mem0',
      routeName: '/api/civil-memory',
    },
    createdAt: '2026-06-11T10:05:00.000Z',
  },
]

const saveSlots: SaveSlotRecord[] = [
  {
    slotId: 'slot-main',
    label: '洛阳战前',
    tick: 15,
    worldVersion: 46,
    savedAt: '2026-06-11T10:10:00.000Z',
  },
]

const replay: ExecutionReplay = {
  requestId: 'replay-1',
  source: 'gateway',
  strategicCommand: '支援洛阳前线',
  basedOnWorldVersion: 40,
  createdTick: 13,
  createdWorldVersion: 45,
  reviewAtTick: 16,
  plannerExplanation: '主力抵达前线后压制敌军',
  plan: {
    intent: 'support',
    priority: 'high',
    orders: [{ unitId: 'unit-a', action: 'march', target: 'tile-1' }],
    constraints: [],
    reviewAfterTicks: 3,
  },
  outcome: 'completed',
  completedTick: 15,
  completedWorldVersion: 46,
  frames: [
    {
      tick: 14,
      worldVersion: 45,
      label: '第一步',
      frontlineSummary: '北军开始行军',
      latestReports: ['前线压力下降'],
      highlights: [],
      orderStates: [
        {
          orderId: 'order-1',
          unitId: 'unit-a',
          action: 'march',
          target: 'tile-1',
          status: 'completed',
          message: '部队抵达目标地',
        },
      ],
    },
  ],
}

const timeline = buildPlayerWorldTimelineReadModel({
  generatedAt: '2026-06-11T10:20:00.000Z',
  events: worldEvents,
  civilMemoryEntries,
  saveSlots,
  replays: [replay],
})
const replayScreen = buildBattleReplayScreenReadModel(replay)
const saveLoad = buildPlayerSaveLoadReadModel(saveSlots)
const civilCards = buildCivilMemoryHistoryCards(civilMemoryEntries)

assert.equal(timeline.contractId, 'player_world_timeline_read_model_v1')
assert.ok(timeline.cards.length >= 4, 'timeline should merge events, Civil Memory, save slots, and replays')
assert.ok(timeline.cards.some((card) => card.category === 'map_change' && card.title === '地图状态已变化'))
assert.ok(timeline.cards.some((card) => card.category === 'court' && card.resultLabel === '已生效'))
assert.ok(timeline.cards.some((card) => card.category === 'system' && card.nextActionLabel === '需要时可从存档恢复'))
assert.ok(timeline.cards.some((card) => card.category === 'court' && card.title === '朝议决议进入执行' && card.locationLabel === '洛阳'))
assert.ok(timeline.cards.some((card) => card.category === 'diplomacy' && card.title === '停战回应送达' && card.targetLabel === '兖州同盟'))
assert.ok(timeline.cards.some((card) => card.category === 'economy_city' && card.title === '粮税入库' && card.locationLabel === '陈留'))
assert.ok(timeline.cards.some((card) => card.category === 'organization_nation' && card.title === '同盟目标推进'))
assert.ok(timeline.cards.some((card) => card.category === 'ai_activity' && card.title === 'AI 提案需要确认' && card.severity === 'high'))
assert.ok(
  historyAuthority.includes('metadata.playerHistory*') &&
    historyAuthority.includes('playerHistoryCategory') &&
    historyAuthority.includes('Court, diplomacy, economy/city, organization/nation, AI activity'),
  'player-history authority should document the cross-domain player-safe event overlay',
)

assert.equal(replayScreen.contractId, 'battle_replay_action_frame_v1')
assert.equal(replayScreen.selectedFrameIndex, 0)
assert.equal(replayScreen.frameCountLabel, '共 1 步')
assert.equal(replayScreen.inspectionHintLabel, '可逐步查看行动结果')
assert.equal(replayScreen.timelineScrubLabel, '拖动查看战况变化')
assert.equal(replayScreen.controls.canPause, true)
assert.equal(replayScreen.controls.canStepForward, true)
assert.equal(replayScreen.frames[0]?.actionLabel, '行军')
assert.equal(replayScreen.frames[0]?.effectLabel, '部队抵达目标地')

assert.equal(saveLoad.contractId, 'player_save_load_slots_v1')
assert.equal(saveLoad.selectedSlotId, 'slot-main')
assert.equal(saveLoad.restoreRiskLabel, '恢复前请确认当前进度已保存')
assert.equal(saveLoad.restoreFeedbackLabel, '选择存档后可预览恢复结果')
assert.equal(saveLoad.emptyStateLabel, '暂无可恢复存档')
assert.equal(saveLoad.slots[0]?.slotLabel, '洛阳战前')
assert.ok(saveLoad.slots[0]?.riskHint?.includes('恢复前'))

assert.equal(civilCards[0]?.contractId, 'civil_memory_history_card_v1')
assert.equal(civilCards[0]?.title, '同盟决议通过')
assert.equal(civilCards[0]?.currentImpactLabel, '已生效')
assert.equal(civilCards[0]?.sourceRefs?.visibility, 'internal_link_only')
assert.equal(civilCards[0]?.sourceRefs?.visible, false)
assert.equal(civilCards[0]?.sourceRefs?.civilMemoryId, 'civil-1')

const playerVisiblePayload = JSON.stringify({
  timelineCards: timeline.cards.map((card) => ({
    category: card.category,
    actorName: card.actorName,
    title: card.title,
    summary: card.summary,
    resultLabel: card.resultLabel,
    consequenceLabel: card.consequenceLabel,
    nextActionLabel: card.nextActionLabel,
    locationLabel: card.locationLabel,
    targetLabel: card.targetLabel,
    severity: card.severity,
    timestampBucket: card.timestampBucket,
  })),
  replayFrames: replayScreen.frames.map((frame) => ({
    frameCountLabel: replayScreen.frameCountLabel,
    inspectionHintLabel: replayScreen.inspectionHintLabel,
    timelineScrubLabel: replayScreen.timelineScrubLabel,
    title: frame.title,
    sideLabel: frame.sideLabel,
    actorName: frame.actorName,
    actionLabel: frame.actionLabel,
    effectLabel: frame.effectLabel,
    mapContextLabel: frame.mapContextLabel,
    roundContextLabel: frame.roundContextLabel,
  })),
  saveSlots: saveLoad.slots.map((slot) => ({
    restoreRiskLabel: saveLoad.restoreRiskLabel,
    restoreFeedbackLabel: saveLoad.restoreFeedbackLabel,
    emptyStateLabel: saveLoad.emptyStateLabel,
    slotLabel: slot.slotLabel,
    savedAtLabel: slot.savedAtLabel,
    worldSummary: slot.worldSummary,
    riskHint: slot.riskHint,
    restorePreviewLabel: slot.restorePreviewLabel,
  })),
  civilCards: civilCards.map((card) => ({
    title: card.title,
    causeLabel: card.causeLabel,
    affectedPartyLabel: card.affectedPartyLabel,
    currentImpactLabel: card.currentImpactLabel,
    suggestedFollowUpLabel: card.suggestedFollowUpLabel,
  })),
})

for (const forbidden of [
  '/api/',
  'memoryProvider',
  'rawEventType',
  'routeName',
  'debug_raw_event',
  'internal_planner_tick',
  'planner_debug',
  'metadata',
  'civilMemoryId',
]) {
  assert.ok(!playerVisiblePayload.includes(forbidden), `player-visible history payload should not leak ${forbidden}`)
}

console.log('[player_history_read_model_assembler_contract] all checks passed')
