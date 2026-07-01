import type { CivilMemoryEntry } from '../contracts/civilMemory'
import type {
  ActionType,
  BattleReplayActionFrame,
  CivilMemoryDetailReadModel,
  BattleReplayScreenReadModel,
  CivilMemoryHistoryCard,
  ExecutionReplay,
  OrderStatus,
  PlayerHistoryNotificationAnchor,
  PlayerHistoryLivePreviewReadModel,
  PlayerSaveLoadReadModel,
  PlayerSaveLoadSlot,
  PlayerWorldTimelineCard,
  PlayerWorldTimelineCategory,
  PlayerWorldTimelineReadModel,
  PlayerWorldTimelineSeverity,
  SaveSlotRecord,
  WorldEventRecord,
} from '../contracts/game'
import type {
  AiPlayerVisibleActivityAggregateGroup,
  AiPlayerVisibleActivityFeedReadModel,
  AiPlayerVisibleActivityItem,
  AiPlayerVisibleActivityMapTargetQueueItem,
  AiPlayerVisibleActivitySortOrder,
} from '../contracts/aiPlayer'

export type BuildPlayerHistoryInput = {
  generatedAt: string
  events?: WorldEventRecord[]
  civilMemoryEntries?: CivilMemoryEntry[]
  saveSlots?: SaveSlotRecord[]
  replays?: ExecutionReplay[]
  notificationAnchors?: PlayerHistoryNotificationAnchor[]
  dismissedNotificationDedupeKeys?: string[]
  limit?: number
}

export type BuildCivilMemoryDetailOptions = {
  sharedScope?: 'public_context'
  shareRetentionLabel?: string
}

export type BuildPlayerHistoryLivePreviewOptions = {
  enabled: boolean
  maxPreviewItems?: number
}

const PLAYER_VISIBLE_ACTIVITY_WORLD_MAP_LABEL = '前线地块'
export const AI_VISIBLE_ACTIVITY_SORT_ORDER: AiPlayerVisibleActivitySortOrder = {
  primary: 'priority_desc',
  secondary: 'turn_desc',
  tertiary: 'sequence_desc',
  fallback: 'occurredAt_desc',
}

export function buildPlayerWorldTimelineReadModel(input: BuildPlayerHistoryInput): PlayerWorldTimelineReadModel {
  const historyPageLimit = Math.max(1, Math.min(80, Math.floor(input.limit ?? 80)))
  const worldEventCivilMemoryIds = collectReferencedCivilMemoryIds(input.events ?? [])
  const cards: PlayerWorldTimelineCard[] = [
    ...(input.events ?? []).map(buildTimelineCardFromWorldEvent),
    ...(input.civilMemoryEntries ?? [])
      .filter((entry) => !worldEventCivilMemoryIds.has(entry.id))
      .map(buildTimelineCardFromCivilMemory),
    ...(input.saveSlots ?? []).map(buildTimelineCardFromSaveSlot),
    ...(input.replays ?? []).map(buildTimelineCardFromReplay),
  ]
    .sort((a, b) => compareTimestampBucketDesc(a.timestampBucket, b.timestampBucket))
    .slice(0, historyPageLimit)
  const lastCard = cards[cards.length - 1]
  const notificationResult = mergePlayerHistoryNotificationAnchors(
    input.notificationAnchors ?? [],
    buildPlayerHistoryNotificationAnchors(cards),
    new Set((input.dismissedNotificationDedupeKeys ?? []).map((item) => item.trim()).filter(Boolean)),
  )

  return {
    contractId: 'player_world_timeline_read_model_v1',
    generatedAt: input.generatedAt,
    historyPageLimit,
    historyCursorStable: true,
    historyNextCursor: lastCard ? `${lastCard.timestampBucket}:${lastCard.id}` : undefined,
    historyDedupeKey: `timeline-page:${cards[0]?.id ?? 'empty'}:${historyPageLimit}`,
    historyNotificationBudget: 3,
    historyCooldownApplied: true,
    historyNotificationSuppressionApplied: notificationResult.suppressedCount > 0,
    historyNotificationSuppressedCount: notificationResult.suppressedCount,
    historyDurableCardAnchor: cards[0]?.id ? `timeline-card:${cards[0].id}` : undefined,
    historyNotificationAnchors: notificationResult.anchors,
    cards,
  }
}

export function buildPlayerVisibleActivityFeed(params: {
  aiPlayerId: string
  factionId: string
  events: WorldEventRecord[]
  contextEvents?: WorldEventRecord[]
  limit?: number
}): AiPlayerVisibleActivityFeedReadModel {
  const normalizedLimit = Math.max(1, Math.min(12, Math.floor(params.limit ?? 6)))
  const mapContextByRequestId = new Map<string, { tileId?: string; label: string }>()
  for (const event of params.contextEvents ?? params.events) {
    const requestId = event.requestId?.trim()
    if (!requestId) {
      continue
    }
    const tileId = resolveActivityMapTargetTileId(event)
    const label = readMetadataString(event, 'playerHistoryTarget')
      || readMetadataString(event, 'playerHistoryLocation')
      || PLAYER_VISIBLE_ACTIVITY_WORLD_MAP_LABEL
    if (!tileId && !label) {
      continue
    }
    const existing = mapContextByRequestId.get(requestId)
    if (!existing || (!existing.tileId && tileId)) {
      mapContextByRequestId.set(requestId, { tileId, label })
    }
  }

  const items: AiPlayerVisibleActivityItem[] = []
  const seenActivityEventIds = new Set<string>()
  for (const event of params.events) {
    if (readMetadataString(event, 'playerHistoryCategory') !== 'ai_activity') {
      continue
    }
    if (readMetadataString(event, 'aiPlayerId') !== params.aiPlayerId) {
      continue
    }
    if (readMetadataString(event, 'playerHistoryFactionId') !== params.factionId) {
      continue
    }
    if (seenActivityEventIds.has(event.id)) {
      continue
    }
    seenActivityEventIds.add(event.id)

    const proposalAction = readMetadataString(event, 'proposalAction')
    const worldAction = readMetadataString(event, 'worldAction')
    const mapContext = event.requestId ? mapContextByRequestId.get(event.requestId) : undefined
    const mapTargetTileId = resolveActivityMapTargetTileId(event) ?? mapContext?.tileId
    const jumpLabel = mapContext?.label || PLAYER_VISIBLE_ACTIVITY_WORLD_MAP_LABEL
    const actorName = readMetadataString(event, 'playerHistoryActorName') || '友军'
    const severity = readTimelineSeverity(readMetadataString(event, 'playerHistorySeverity'), event.success ? 'medium' : 'high')
    const intentLabel = readMetadataString(event, 'playerHistoryIntent')
      || buildVisibleActivityIntentLabel(proposalAction, worldAction)
    const reasonLabel = readMetadataString(event, 'playerHistoryReason')
      || buildVisibleActivityReasonLabel(proposalAction, worldAction, event.success)
    const copy = buildVisibleActivityCopy({
      action: proposalAction,
      worldAction,
      success: event.success,
      actorName,
      jumpLabel,
      fallbackTitle: readMetadataString(event, 'playerHistoryTitle') || (event.success ? 'AI 行动已完成' : 'AI 行动受阻'),
      fallbackSummary: readMetadataString(event, 'playerHistorySummary') || event.message || 'AI 活动已记录',
      fallbackResultLabel: readMetadataString(event, 'playerHistoryResultLabel') || (event.success ? '已完成' : '处理中'),
    })

    items.push({
      activityEventId: event.id,
      actorType: 'ai_player',
      actorId: params.aiPlayerId,
      actorName,
      intentLabel,
      reasonLabel,
      priority: readVisibleActivityPriority(event, severity),
      sequence: buildVisibleActivitySequence(event),
      turn: event.tick,
      occurredAt: event.createdAt,
      title: copy.title,
      summary: copy.summary,
      resultLabel: copy.resultLabel,
      severity,
      createdAt: event.createdAt,
      mapTargetTileId,
      jumpTarget: mapTargetTileId
        ? {
          surface: 'world_map',
          targetId: mapTargetTileId,
          label: jumpLabel,
        }
        : undefined,
      sourceRef: {
        visibility: 'internal_link_only',
        visible: false,
        worldEventId: event.id,
        proposalId: readMetadataString(event, 'proposalId'),
        requestId: event.requestId,
      },
    })
  }
  const sortedItems = items
    .sort(compareVisibleActivityItems)
    .slice(0, normalizedLimit)

  return {
    contractId: 'ai_player_visible_activity_feed_v1',
    aiPlayerId: params.aiPlayerId,
    factionId: params.factionId,
    count: sortedItems.length,
    sortOrder: AI_VISIBLE_ACTIVITY_SORT_ORDER,
    aggregateGroups: buildVisibleActivityAggregateGroups(sortedItems),
    mapTargetQueue: buildVisibleActivityMapTargetQueue(sortedItems),
    items: sortedItems,
  }
}

function collectReferencedCivilMemoryIds(events: WorldEventRecord[]): Set<string> {
  const ids = new Set<string>()
  for (const event of events) {
    const civilMemoryId = readMetadataString(event, 'playerHistoryCivilMemoryId')
    if (civilMemoryId) {
      ids.add(civilMemoryId)
    }
  }
  return ids
}

export function buildPlayerHistoryLivePreviewReadModel(
  events: WorldEventRecord[],
  options: BuildPlayerHistoryLivePreviewOptions,
): PlayerHistoryLivePreviewReadModel {
  const maxPreviewItems = Math.max(1, Math.min(8, Math.floor(options.maxPreviewItems ?? 3)))
  if (!options.enabled) {
    return {
      contractId: 'player_history_live_preview_v1',
      optInRequired: true,
      enabled: false,
      visibleStateLabel: '实时预览未开启',
      collapsedFeedbackLabel: '手动开启后查看新动态',
      droppedCountLabel: '暂无新动态',
      previewCardCount: 0,
      backpressureApplied: false,
      rawStreamDefaultDenied: true,
    }
  }

  const previewCount = Math.min(events.length, maxPreviewItems)
  const droppedCount = Math.max(0, events.length - previewCount)
  const firstCardId = events[0]?.id ? `event-${events[0].id}` : undefined
  return {
    contractId: 'player_history_live_preview_v1',
    optInRequired: true,
    enabled: true,
    visibleStateLabel: '实时预览已开启',
    collapsedFeedbackLabel: droppedCount > 0 ? '更多新动态' : '暂无更多新动态',
    droppedCountLabel: droppedCount > 0 ? `已合并 ${droppedCount} 条新动态` : '暂无折叠动态',
    previewCardCount: previewCount,
    backpressureApplied: droppedCount > 0,
    rawStreamDefaultDenied: true,
    durableCardAnchor: firstCardId ? `timeline-card:${firstCardId}` : undefined,
  }
}

function buildPlayerHistoryNotificationAnchors(cards: PlayerWorldTimelineCard[]): PlayerHistoryNotificationAnchor[] {
  const anchors: PlayerHistoryNotificationAnchor[] = []
  const seenDedupeKeys = new Set<string>()
  for (const card of cards) {
    if (anchors.length >= 3) {
      break
    }
    const dedupeKey = buildNotificationDedupeKey(card)
    if (seenDedupeKeys.has(dedupeKey)) {
      continue
    }
    seenDedupeKeys.add(dedupeKey)
    anchors.push({
      contractId: 'player_history_notification_anchor_v1',
      id: `notification-${anchors.length + 1}-${card.id}`,
      durableCardAnchor: `timeline-card:${card.id}`,
      dedupeKey,
      budgetSlot: anchors.length + 1,
      accessState: 'open',
      accessFeedbackLabel: '已定位提醒',
      title: resolveNotificationTitle(card),
      body: resolveNotificationBody(card),
      actionLabel: '前往大事查看',
      cooldownLabel: '已合并相近提醒',
      dismissed: false,
    })
  }
  return anchors
}

function mergePlayerHistoryNotificationAnchors(
  injectedAnchors: PlayerHistoryNotificationAnchor[],
  cardAnchors: PlayerHistoryNotificationAnchor[],
  dismissedDedupeKeys: Set<string>,
): { anchors: PlayerHistoryNotificationAnchor[], suppressedCount: number } {
  const merged: PlayerHistoryNotificationAnchor[] = []
  const seenDedupeKeys = new Set<string>()
  let suppressedCount = 0
  for (const anchor of [...injectedAnchors, ...cardAnchors]) {
    if (merged.length >= 3) {
      break
    }
    const dedupeKey = anchor.dedupeKey.trim()
    if (!dedupeKey || seenDedupeKeys.has(dedupeKey)) {
      continue
    }
    seenDedupeKeys.add(dedupeKey)
    if (dismissedDedupeKeys.has(dedupeKey)) {
      suppressedCount += 1
      continue
    }
    merged.push({
      ...anchor,
      budgetSlot: merged.length + 1,
    })
  }
  return { anchors: merged, suppressedCount }
}

function buildNotificationDedupeKey(card: PlayerWorldTimelineCard): string {
  return [
    card.category,
    normalizeDedupePart(card.actorName),
    normalizeDedupePart(card.title),
    normalizeDedupePart(card.resultLabel),
    normalizeDedupePart(card.timestampBucket),
  ].join(':')
}

function normalizeDedupePart(value: string | undefined): string {
  const normalized = (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[:|]/g, '-')
  return normalized || 'none'
}

function resolveNotificationTitle(card: PlayerWorldTimelineCard): string {
  if (card.severity === 'critical' || card.severity === 'high') {
    return '重要大事已入册'
  }
  return '新的大事已入册'
}

function resolveNotificationBody(card: PlayerWorldTimelineCard): string {
  const summary = card.summary.trim()
  if (summary.length > 0) {
    return summary
  }
  return card.title.trim() || '可前往大事查看'
}

export function buildBattleReplayScreenReadModel(replay: ExecutionReplay): BattleReplayScreenReadModel {
  const frames: BattleReplayActionFrame[] = replay.frames.flatMap((frame, frameIndex) => {
    if (frame.orderStates.length > 0) {
      return frame.orderStates.map((order, orderIndex) => ({
        contractId: 'battle_replay_action_frame_v1' as const,
        id: buildReplayFrameId(frameIndex, orderIndex),
        frameIndex,
        title: `第 ${frameIndex + 1} 步`,
        sideLabel: resolvePlanSourceLabel(replay.source),
        actorName: '参战部队',
        actionLabel: resolveActionLabel(order.action),
        effectLabel: order.message || resolveOrderStatusLabel(order.status),
        mapContextLabel: frame.frontlineSummary || '战场态势更新',
        roundContextLabel: `第 ${frameIndex + 1} 段战况`,
        inspectable: true,
      }))
    }

    return [{
      contractId: 'battle_replay_action_frame_v1' as const,
      id: buildReplayFrameId(frameIndex),
      frameIndex,
      title: `第 ${frameIndex + 1} 步`,
      sideLabel: resolvePlanSourceLabel(replay.source),
      actorName: '战场态势',
      actionLabel: '局势变化',
      effectLabel: '战线更新',
      mapContextLabel: frame.frontlineSummary || '战场态势更新',
      roundContextLabel: `第 ${frameIndex + 1} 段战况`,
      inspectable: true,
    }]
  })

  return {
    contractId: 'battle_replay_action_frame_v1',
    replayTitle: '战斗回放',
    battleReportId: buildReplayScreenReportId(replay),
    selectedFrameIndex: frames.length > 0 ? 0 : -1,
    frameCountLabel: frames.length > 0 ? `共 ${frames.length} 步` : '暂无可检查步骤',
    inspectionHintLabel: frames.length > 0 ? '可逐步查看行动结果' : '暂无回放步骤',
    timelineScrubLabel: '拖动查看战况变化',
    frames,
    controls: {
      canPause: true,
      canStepForward: true,
      canStepBackward: true,
      canScrub: frames.length > 1,
    },
  }
}

function buildReplayFrameId(frameIndex: number, orderIndex?: number): string {
  return orderIndex === undefined
    ? `replay-frame-${frameIndex + 1}`
    : `replay-frame-${frameIndex + 1}-action-${orderIndex + 1}`
}

function buildReplayScreenReportId(replay: ExecutionReplay): string {
  return `battle-replay-${replay.createdTick}-${replay.createdWorldVersion}-${replay.frames.length}`
}

export function buildUnavailableBattleReplayScreenReadModel(): BattleReplayScreenReadModel {
  return {
    contractId: 'battle_replay_action_frame_v1',
    replayTitle: '回放已不可用',
    battleReportId: 'unavailable',
    selectedFrameIndex: -1,
    frameCountLabel: '暂无可检查步骤',
    inspectionHintLabel: '这段回放暂时无法查看，可返回战报。',
    timelineScrubLabel: '暂无可拖动内容',
    frames: [],
    controls: {
      canPause: false,
      canStepForward: false,
      canStepBackward: false,
      canScrub: false,
    },
  }
}

export function buildPlayerSaveLoadReadModel(saveSlots: SaveSlotRecord[]): PlayerSaveLoadReadModel {
  const sortedSlots = saveSlots
    .slice()
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))

  return {
    contractId: 'player_save_load_slots_v1',
    selectedSlotId: sortedSlots[0]?.slotId,
    restoreRiskLabel: '恢复前请确认当前进度已保存',
    restoreFeedbackLabel: sortedSlots.length > 0 ? '选择存档后可预览恢复结果' : undefined,
    emptyStateLabel: '暂无可恢复存档',
    slots: sortedSlots.map(buildPlayerSaveLoadSlot),
  }
}

export function buildCivilMemoryHistoryCards(entries: CivilMemoryEntry[]): CivilMemoryHistoryCard[] {
  return entries.map((entry) => ({
    contractId: 'civil_memory_history_card_v1',
    id: entry.id,
    title: entry.title || resolveCivilMemoryTypeLabel(entry.type),
    causeLabel: entry.summary || '议事结果已记录',
    affectedPartyLabel: resolveAffectedPartyLabel(entry),
    currentImpactLabel: resolveCivilOutcomeLabel(entry.outcome),
    suggestedFollowUpLabel: resolveCivilFollowUpLabel(entry),
    severity: resolveCivilSeverity(entry),
    sourceRefs: {
      visibility: 'internal_link_only',
      visible: false,
      civilMemoryId: entry.id,
    },
  }))
}

export function buildCivilMemoryDetailReadModel(
  entry: CivilMemoryEntry,
  options: BuildCivilMemoryDetailOptions = {},
): CivilMemoryDetailReadModel {
  return {
    contractId: 'civil_memory_detail_read_model_v1',
    title: entry.title || resolveCivilMemoryTypeLabel(entry.type),
    summary: entry.summary || '议事记录已归档',
    affectedPartyLabel: resolveAffectedPartyLabel(entry),
    resultLabel: resolveCivilOutcomeLabel(entry.outcome),
    consequenceLabel: entry.relatedIds.length > 0 ? `关联 ${entry.relatedIds.length} 项线索` : '暂无额外关联线索',
    followUpLabel: resolveCivilFollowUpLabel(entry),
    timestampLabel: `第 ${Math.max(0, Math.floor(entry.tick))} 回合`,
    relatedCountLabel: `关联 ${entry.relatedIds.length} 项`,
    responsibilityCountLabel: `责任 ${entry.responsibilities.length} 项`,
    archiveStateLabel: entry.integrity ? '记录已归档' : '记录待归档',
    sharedScope: options.sharedScope,
    shareStateLabel: options.sharedScope === 'public_context' ? '已开放只读传闻' : undefined,
    shareRetentionLabel: options.sharedScope === 'public_context' ? options.shareRetentionLabel : undefined,
  }
}

function buildTimelineCardFromWorldEvent(event: WorldEventRecord): PlayerWorldTimelineCard {
  return {
    contractId: 'player_world_timeline_read_model_v1',
    id: `world-${event.id}`,
    category: resolveWorldEventCategory(event),
    actorName: resolveActorNameFromEvent(event),
    title: resolveWorldEventTitle(event),
    summary: readMetadataString(event, 'playerHistorySummary') || event.message || resolveWorldEventTitle(event),
    locationLabel: readMetadataString(event, 'playerHistoryLocation'),
    targetLabel: readMetadataString(event, 'playerHistoryTarget'),
    resultLabel: readMetadataString(event, 'playerHistoryResultLabel') || (event.success ? '已完成' : '需要处理'),
    consequenceLabel: readMetadataString(event, 'playerHistoryConsequence') || `世界进度 ${event.worldVersion}`,
    nextActionLabel: readMetadataString(event, 'playerHistoryNextAction') || (event.success ? undefined : '查看详情'),
    sharePolicy: resolveWorldEventSharePolicy(event),
    shareStateLabel: readMetadataString(event, 'playerHistoryShareStateLabel'),
    shareRetentionLabel: readMetadataString(event, 'playerHistoryShareRetentionLabel'),
    severity: resolveWorldEventSeverity(event),
    timestampBucket: buildTickBucket(event.tick, event.createdAt),
    sourceRefs: {
      visibility: 'internal_link_only',
      visible: false,
      worldEventId: event.id,
      replayRequestId: event.requestId,
      civilMemoryId: readMetadataString(event, 'playerHistoryCivilMemoryId'),
    },
  }
}

function buildTimelineCardFromCivilMemory(entry: CivilMemoryEntry): PlayerWorldTimelineCard {
  return {
    contractId: 'player_world_timeline_read_model_v1',
    id: `civil-${entry.id}`,
    category: resolveCivilTimelineCategory(entry),
    actorName: resolveAffectedPartyLabel(entry),
    title: entry.title || resolveCivilMemoryTypeLabel(entry.type),
    summary: entry.summary || '议事记录已归档',
    resultLabel: resolveCivilOutcomeLabel(entry.outcome),
    consequenceLabel: entry.relatedIds.length > 0 ? `关联 ${entry.relatedIds.length} 项` : undefined,
    nextActionLabel: resolveCivilFollowUpLabel(entry),
    severity: resolveCivilSeverity(entry),
    timestampBucket: buildTickBucket(entry.tick, entry.createdAt),
    sourceRefs: {
      visibility: 'internal_link_only',
      visible: false,
      civilMemoryId: entry.id,
    },
  }
}

function buildTimelineCardFromSaveSlot(slot: SaveSlotRecord): PlayerWorldTimelineCard {
  return {
    contractId: 'player_world_timeline_read_model_v1',
    id: `save-${slot.slotId}`,
    category: 'system',
    actorName: '玩家',
    title: '存档已保存',
    summary: slot.label || '新的世界存档',
    resultLabel: '可恢复',
    consequenceLabel: `世界进度 ${slot.worldVersion}`,
    nextActionLabel: '需要时可从存档恢复',
    severity: 'low',
    timestampBucket: buildTickBucket(slot.tick, slot.savedAt),
    sourceRefs: {
      visibility: 'internal_link_only',
      visible: false,
      saveSlotId: slot.slotId,
    },
  }
}

function buildTimelineCardFromReplay(replay: ExecutionReplay): PlayerWorldTimelineCard {
  const replayCardId = buildReplayTimelineCardId(replay)
  return {
    contractId: 'player_world_timeline_read_model_v1',
    id: replayCardId,
    category: 'battle',
    actorName: resolvePlanSourceLabel(replay.source),
    title: '战斗回放已生成',
    summary: replay.frames.length > 0 ? '可以查看行动过程' : '回放暂不可检查',
    resultLabel: resolveReplayOutcomeLabel(replay.outcome),
    consequenceLabel: replay.completedWorldVersion ? `世界进度 ${replay.completedWorldVersion}` : undefined,
    nextActionLabel: replay.frames.length > 0 ? '查看回放' : undefined,
    severity: replay.outcome === 'failed' ? 'high' : 'medium',
    timestampBucket: buildTickBucket(replay.createdTick, new Date(0).toISOString()),
    sourceRefs: {
      visibility: 'internal_link_only',
      visible: false,
      replayRequestId: replay.requestId,
    },
  }
}

function buildReplayTimelineCardId(replay: ExecutionReplay): string {
  return `replay-card-${replay.createdTick}-${replay.createdWorldVersion}-${replay.frames.length}`
}

function buildPlayerSaveLoadSlot(slot: SaveSlotRecord): PlayerSaveLoadSlot {
  return {
    contractId: 'player_save_load_slots_v1',
    slotId: slot.slotId,
    slotLabel: slot.label || '未命名存档',
    savedAtLabel: formatSavedAtLabel(slot.savedAt),
    worldSummary: `第 ${slot.tick} 回合，世界进度 ${slot.worldVersion}`,
    riskHint: '恢复前请确认当前进度已保存',
    restorePreviewLabel: '将回到该存档记录的世界状态',
  }
}

function buildVisibleActivityCopy(input: {
  action?: string
  worldAction?: string
  success: boolean
  actorName: string
  jumpLabel: string
  fallbackTitle: string
  fallbackSummary: string
  fallbackResultLabel: string
}): Pick<AiPlayerVisibleActivityItem, 'title' | 'summary' | 'resultLabel'> {
  if (input.action === 'tile_occupy' || input.worldAction === 'occupyTile') {
    if (input.success) {
      return {
        title: '前线已推进',
        summary: `${input.actorName}已进驻${input.jumpLabel}，前线归属已经刷新。`,
        resultLabel: '已占住',
      }
    }
    return {
      title: '前线推进受阻',
      summary: `${input.actorName}向${input.jumpLabel}推进时受阻，前线暂未改写。`,
      resultLabel: '推进受阻',
    }
  }
  return {
    title: input.fallbackTitle,
    summary: input.fallbackSummary,
    resultLabel: input.fallbackResultLabel,
  }
}

function buildVisibleActivityIntentLabel(action?: string, worldAction?: string): string {
  if (action === 'tile_occupy' || worldAction === 'occupyTile') {
    return '占据前线地块'
  }
  if (action === 'resource_gather' || worldAction === 'gatherAiResourceTile') {
    return '采集前线资源'
  }
  if (action === 'march_move' || worldAction === 'moveUnit') {
    return '推进部队路线'
  }
  if (action === 'garrison_set' || worldAction === 'queueTacticalOverride') {
    return '布防前线据点'
  }
  if (action === 'city_siege' || worldAction === 'queuePlanExecution') {
    return '压迫城池目标'
  }
  return '推进当前行动'
}

function buildVisibleActivityReasonLabel(action?: string, worldAction?: string, success = true): string {
  if (action === 'tile_occupy' || worldAction === 'occupyTile') {
    return success ? '扩大前线控制' : '前线推进受阻'
  }
  if (action === 'resource_gather' || worldAction === 'gatherAiResourceTile') {
    return '补足行军补给'
  }
  if (action === 'march_move' || worldAction === 'moveUnit') {
    return '接近地图目标'
  }
  if (action === 'garrison_set' || worldAction === 'queueTacticalOverride') {
    return '稳固前线防线'
  }
  if (action === 'city_siege' || worldAction === 'queuePlanExecution') {
    return '打开攻城战线'
  }
  return success ? '行动结果已写入世界' : '行动需要重新评估'
}

function readVisibleActivityPriority(
  event: WorldEventRecord,
  severity: PlayerWorldTimelineSeverity,
): number {
  const metadataPriority = event.metadata?.playerHistoryPriority
  if (typeof metadataPriority === 'number' && Number.isFinite(metadataPriority)) {
    return Math.max(0, Math.round(metadataPriority))
  }
  if (typeof metadataPriority === 'string' && metadataPriority.trim()) {
    const parsed = Number(metadataPriority)
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed))
    }
  }
  if (severity === 'critical') {
    return 100
  }
  if (severity === 'high') {
    return 80
  }
  if (severity === 'medium') {
    return 60
  }
  return 30
}

function buildVisibleActivitySequence(event: WorldEventRecord): number {
  const tick = Number.isFinite(event.tick) ? Math.max(0, Math.trunc(event.tick)) : 0
  const worldVersion = Number.isFinite(event.worldVersion) ? Math.max(0, Math.trunc(event.worldVersion)) : 0
  return tick * 1000 + worldVersion
}

export function compareVisibleActivityItems(a: AiPlayerVisibleActivityItem, b: AiPlayerVisibleActivityItem): number {
  const priorityDelta = b.priority - a.priority
  if (priorityDelta !== 0) {
    return priorityDelta
  }
  const turnDelta = (b.turn ?? -1) - (a.turn ?? -1)
  if (turnDelta !== 0) {
    return turnDelta
  }
  const sequenceDelta = b.sequence - a.sequence
  if (sequenceDelta !== 0) {
    return sequenceDelta
  }
  const timeDelta = Date.parse(b.occurredAt) - Date.parse(a.occurredAt)
  if (timeDelta !== 0) {
    return timeDelta
  }
  return a.activityEventId.localeCompare(b.activityEventId)
}

export function buildVisibleActivityAggregateGroups(
  items: AiPlayerVisibleActivityItem[],
): AiPlayerVisibleActivityAggregateGroup[] {
  const groups = new Map<string, AiPlayerVisibleActivityAggregateGroup>()
  for (const item of items) {
    const groupId = `ai_activity_group:${item.actorId}:${item.intentLabel}`
    const existing = groups.get(groupId)
    if (!existing) {
      groups.set(groupId, {
        groupId,
        actorId: item.actorId,
        actorName: item.actorName,
        intentLabel: item.intentLabel,
        activityCount: 1,
        latestTurn: item.turn,
        latestOccurredAt: item.occurredAt,
        priority: item.priority,
        mapTargetTileIds: item.mapTargetTileId ? [item.mapTargetTileId] : [],
        activityEventIds: [item.activityEventId],
      })
      continue
    }
    existing.activityCount += 1
    existing.priority = Math.max(existing.priority, item.priority)
    existing.activityEventIds.push(item.activityEventId)
    if (item.turn !== undefined) {
      existing.latestTurn = Math.max(existing.latestTurn ?? item.turn, item.turn)
    }
    if (Date.parse(item.occurredAt) > Date.parse(existing.latestOccurredAt)) {
      existing.latestOccurredAt = item.occurredAt
    }
    if (item.mapTargetTileId && !existing.mapTargetTileIds.includes(item.mapTargetTileId)) {
      existing.mapTargetTileIds.push(item.mapTargetTileId)
    }
  }
  return Array.from(groups.values()).sort((a, b) => {
    const priorityDelta = b.priority - a.priority
    if (priorityDelta !== 0) {
      return priorityDelta
    }
    const turnDelta = (b.latestTurn ?? -1) - (a.latestTurn ?? -1)
    if (turnDelta !== 0) {
      return turnDelta
    }
    return Date.parse(b.latestOccurredAt) - Date.parse(a.latestOccurredAt)
  })
}

export function buildVisibleActivityMapTargetQueue(
  items: AiPlayerVisibleActivityItem[],
): AiPlayerVisibleActivityMapTargetQueueItem[] {
  return items.flatMap((item) => {
    if (!item.mapTargetTileId || !item.jumpTarget) {
      return []
    }
    return [{
      queueId: `ai_activity_target:${item.activityEventId}:${item.mapTargetTileId}`,
      activityEventId: item.activityEventId,
      actorId: item.actorId,
      actorName: item.actorName,
      intentLabel: item.intentLabel,
      priority: item.priority,
      sequence: item.sequence,
      occurredAt: item.occurredAt,
      mapTargetTileId: item.mapTargetTileId,
      jumpTarget: item.jumpTarget,
      sourceRef: item.sourceRef,
    }]
  })
}

function resolveActivityMapTargetTileId(event: WorldEventRecord): string | undefined {
  const metadata = event.metadata
  const direct = [
    metadata?.mapTargetTileId,
    metadata?.targetTileId,
    metadata?.tileId,
    metadata?.cellId,
  ]
  for (const value of direct) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return undefined
}

function readTimelineSeverity(
  value: string | undefined,
  fallback: PlayerWorldTimelineSeverity,
): PlayerWorldTimelineSeverity {
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'critical') {
    return value
  }
  return fallback
}

function resolveWorldEventCategory(event: WorldEventRecord): PlayerWorldTimelineCategory {
  const explicit = readMetadataString(event, 'playerHistoryCategory')
  if (isPlayerWorldTimelineCategory(explicit)) return explicit
  if (event.category === 'replay') return 'battle'
  if (event.category === 'planning') return 'ai_activity'
  if (event.category === 'persistence') return 'system'
  if (event.category === 'world_action') return 'map_change'
  return 'system'
}

function resolveWorldEventTitle(event: WorldEventRecord): string {
  const explicit = readMetadataString(event, 'playerHistoryTitle')
  if (explicit) return explicit
  if (event.category === 'replay') return event.success ? '战斗回放已更新' : '战斗回放需要检查'
  if (event.category === 'planning') return event.success ? 'AI 行动已推进' : 'AI 行动受阻'
  if (event.category === 'persistence') return event.success ? '世界状态已保存' : '世界状态保存异常'
  if (event.category === 'world_action') return event.success ? '地图状态已变化' : '地图行动未完成'
  return event.success ? '系统状态已更新' : '系统状态需要检查'
}

function resolveActorNameFromEvent(event: WorldEventRecord): string {
  const explicit = readMetadataString(event, 'playerHistoryActorName')
  if (explicit) return explicit
  const actor = event.metadata?.actorName
  if (typeof actor === 'string' && actor.trim()) return actor.trim()
  const faction = event.metadata?.factionId
  if (typeof faction === 'string' && faction.trim()) return `势力 ${faction.trim()}`
  return '世界'
}

function resolveWorldEventSeverity(event: WorldEventRecord): PlayerWorldTimelineSeverity {
  const explicit = readMetadataString(event, 'playerHistorySeverity')
  if (explicit === 'low' || explicit === 'medium' || explicit === 'high' || explicit === 'critical') return explicit
  return event.success ? 'low' : 'high'
}

function resolveWorldEventSharePolicy(event: WorldEventRecord): 'explicit_spectator' | undefined {
  return readMetadataString(event, 'playerHistorySharePolicy') === 'explicit_spectator' ? 'explicit_spectator' : undefined
}

function readMetadataString(event: WorldEventRecord, key: string): string | undefined {
  const value = event.metadata?.[key]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function isPlayerWorldTimelineCategory(value: string | undefined): value is PlayerWorldTimelineCategory {
  return value === 'battle'
    || value === 'court'
    || value === 'diplomacy'
    || value === 'economy_city'
    || value === 'ai_activity'
    || value === 'organization_nation'
    || value === 'map_change'
    || value === 'system'
}

function resolveCivilTimelineCategory(entry: CivilMemoryEntry): PlayerWorldTimelineCategory {
  if (entry.type === 'court_session_closed' || entry.type === 'court_resolution') return 'court'
  if (entry.type === 'execution_outcome') return 'ai_activity'
  return 'organization_nation'
}

function resolveCivilMemoryTypeLabel(type: CivilMemoryEntry['type']): string {
  switch (type) {
    case 'agenda_compiled':
      return '议题已整理'
    case 'court_session_closed':
      return '朝议已结束'
    case 'court_resolution':
      return '决议已形成'
    case 'execution_outcome':
      return '执行已有结果'
  }
}

function resolveCivilOutcomeLabel(outcome: CivilMemoryEntry['outcome']): string {
  if (outcome === 'success') return '已生效'
  if (outcome === 'failed') return '未达成'
  if (outcome === 'pending') return '待推进'
  return '已记录'
}

function resolveCivilFollowUpLabel(entry: CivilMemoryEntry): string | undefined {
  if (entry.outcome === 'failed') return '重新评估方案'
  if (entry.outcome === 'pending') return '等待执行结果'
  if (entry.type === 'agenda_compiled') return '进入议事'
  return undefined
}

function resolveCivilSeverity(entry: CivilMemoryEntry): PlayerWorldTimelineSeverity {
  if (entry.outcome === 'failed') return 'high'
  if (entry.type === 'court_resolution') return 'medium'
  return 'low'
}

function resolveAffectedPartyLabel(entry: CivilMemoryEntry): string {
  if (entry.factionIds.length > 0) return `相关势力 ${entry.factionIds.join('、')}`
  if (entry.responsibilities.length > 0) return `相关席位 ${entry.responsibilities.length} 个`
  return '全局'
}

function resolvePlanSourceLabel(source: ExecutionReplay['source']): string {
  if (source === 'gateway') return 'AI 同盟'
  if (source === 'local') return '本地 AI'
  return '系统推演'
}

function resolveReplayOutcomeLabel(outcome: ExecutionReplay['outcome']): string {
  if (outcome === 'completed') return '已结束'
  if (outcome === 'failed') return '未完成'
  if (outcome === 'running') return '进行中'
  return '已清理'
}

function resolveActionLabel(action: ActionType): string {
  if (action === 'march') return '行军'
  if (action === 'garrison') return '驻守'
  if (action === 'recon') return '侦察'
  if (action === 'support') return '支援'
  return '占领'
}

function resolveOrderStatusLabel(status: OrderStatus): string {
  if (status === 'completed') return '行动完成'
  if (status === 'failed') return '行动失败'
  if (status === 'running') return '行动进行中'
  return '等待执行'
}

function buildTickBucket(tick: number, iso: string): string {
  return `第 ${tick} 回合 · ${formatSavedAtLabel(iso)}`
}

function formatSavedAtLabel(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '时间未知'
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const hh = String(date.getUTCHours()).padStart(2, '0')
  const mi = String(date.getUTCMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

function compareTimestampBucketDesc(left: string, right: string): number {
  return right.localeCompare(left)
}
