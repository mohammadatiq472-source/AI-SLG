import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { buildPlayerVisibleActivityFeed } from '../../shared/domain/playerHistory'
import type { WorldEventRecord } from '../../shared/contracts/game'
import { buildAiPlayerVisibleActivityFeedFromHistoryAnchors } from '../src/application/ai/aiPlayerSubjectReadModel'
import { buildPlayerHistoryAiActivityFeed } from '../src/routes/playerHistory'

const FORBIDDEN_PLAYER_TERMS = [
  'tile_occupy',
  'proposal',
  'receipt',
  'read model',
  'authority',
  'tier',
]

function assertNoEngineeringLeak(text: string, label: string) {
  assert.match(text, /[\u4e00-\u9fff]/, `${label} should contain player-facing Chinese copy`)
  for (const token of FORBIDDEN_PLAYER_TERMS) {
    assert.equal(
      text.toLowerCase().includes(token),
      false,
      `${label} should not leak engineering term: ${token}`,
    )
  }
}

const playerHistoryFeed = buildPlayerVisibleActivityFeed({
  aiPlayerId: 'ai_qingzhou_frontier_1',
  factionId: 'qingzhou',
  events: [
    {
      id: 'event-ai-occupy-1',
      category: 'planning',
      action: 'ai_player_execute_proposal',
      success: true,
      tick: 128,
      worldVersion: 44,
      createdAt: '2026-06-19T10:00:00.000Z',
      requestId: 'req-occupy-1',
      message: 'ai executed occupy order',
      metadata: {
        playerHistoryCategory: 'ai_activity',
        playerHistoryFactionId: 'qingzhou',
        aiPlayerId: 'ai_qingzhou_frontier_1',
        playerHistoryActorName: '青州前锋营',
        playerHistoryTitle: 'AI 行动已完成',
        playerHistorySummary: '行动完成，结果已归档。',
        playerHistoryResultLabel: '已完成',
        playerHistorySeverity: 'medium',
        proposalAction: 'tile_occupy',
        worldAction: 'occupyTile',
        proposalId: 'proposal-hidden-1',
      },
    },
    {
      id: 'event-map-occupy-1',
      category: 'world_action',
      action: 'occupyTile',
      success: true,
      tick: 128,
      worldVersion: 44,
      createdAt: '2026-06-19T10:00:01.000Z',
      requestId: 'req-occupy-1',
      message: 'tile occupied',
      metadata: {
        playerHistoryCategory: 'map_change',
        playerHistoryLocation: '河东前线',
        playerHistoryTarget: '河东据点',
        tileId: 'tile-frontier-7',
      },
    },
  ],
  limit: 6,
})

assert.equal(playerHistoryFeed.contractId, 'ai_player_visible_activity_feed_v1')
assert.equal(playerHistoryFeed.count, 1)
assert.equal(playerHistoryFeed.items[0]?.activityEventId, 'event-ai-occupy-1')
assert.equal(playerHistoryFeed.items[0]?.actorType, 'ai_player')
assert.equal(playerHistoryFeed.items[0]?.actorId, 'ai_qingzhou_frontier_1')
assert.equal(playerHistoryFeed.items[0]?.mapTargetTileId, 'tile-frontier-7')
assert.equal(playerHistoryFeed.items[0]?.jumpTarget?.surface, 'world_map')
assert.equal(playerHistoryFeed.items[0]?.jumpTarget?.targetId, 'tile-frontier-7')
assert.equal(playerHistoryFeed.items[0]?.jumpTarget?.label, '河东据点')
assert.equal(playerHistoryFeed.items[0]?.sourceRef.worldEventId, 'event-ai-occupy-1')
assert.equal(playerHistoryFeed.items[0]?.sourceRef.requestId, 'req-occupy-1')
assert.equal(playerHistoryFeed.items[0]?.intentLabel, '占据前线地块')
assert.equal(playerHistoryFeed.items[0]?.reasonLabel, '扩大前线控制')
assert.equal(playerHistoryFeed.items[0]?.priority, 60)
assert.equal(playerHistoryFeed.items[0]?.sequence, 128044)
assert.equal(playerHistoryFeed.items[0]?.turn, 128)
assert.equal(playerHistoryFeed.items[0]?.occurredAt, '2026-06-19T10:00:00.000Z')
assert.equal(playerHistoryFeed.items[0]?.title, '前线已推进')
assert.match(playerHistoryFeed.items[0]?.summary ?? '', /青州前锋营/)
assert.match(playerHistoryFeed.items[0]?.summary ?? '', /河东据点/)
assertNoEngineeringLeak(playerHistoryFeed.items[0]?.title ?? '', 'playerHistory activity title')
assertNoEngineeringLeak(playerHistoryFeed.items[0]?.summary ?? '', 'playerHistory activity summary')
assertNoEngineeringLeak(playerHistoryFeed.items[0]?.intentLabel ?? '', 'playerHistory activity intent')
assertNoEngineeringLeak(playerHistoryFeed.items[0]?.reasonLabel ?? '', 'playerHistory activity reason')

const sortedAggregateFeed = buildPlayerVisibleActivityFeed({
  aiPlayerId: 'ai_qingzhou_frontier_1',
  factionId: 'qingzhou',
  events: [
    {
      id: 'event-ai-sort-low',
      category: 'planning',
      action: 'ai_player_execute_proposal',
      success: true,
      tick: 130,
      worldVersion: 10,
      createdAt: '2026-06-19T10:02:00.000Z',
      requestId: 'req-sort-low',
      message: 'low priority occupy',
      metadata: {
        playerHistoryCategory: 'ai_activity',
        playerHistoryFactionId: 'qingzhou',
        aiPlayerId: 'ai_qingzhou_frontier_1',
        playerHistoryActorName: '青州前锋营',
        playerHistorySeverity: 'medium',
        proposalAction: 'tile_occupy',
        worldAction: 'occupyTile',
      },
    },
    {
      id: 'event-ai-sort-high',
      category: 'planning',
      action: 'ai_player_execute_proposal',
      success: true,
      tick: 129,
      worldVersion: 11,
      createdAt: '2026-06-19T10:01:00.000Z',
      requestId: 'req-sort-high',
      message: 'high priority occupy',
      metadata: {
        playerHistoryCategory: 'ai_activity',
        playerHistoryFactionId: 'qingzhou',
        aiPlayerId: 'ai_qingzhou_frontier_1',
        playerHistoryActorName: '青州前锋营',
        playerHistorySeverity: 'high',
        proposalAction: 'tile_occupy',
        worldAction: 'occupyTile',
      },
    },
    {
      id: 'event-ai-sort-newer-high',
      category: 'planning',
      action: 'ai_player_execute_proposal',
      success: true,
      tick: 131,
      worldVersion: 12,
      createdAt: '2026-06-19T10:03:00.000Z',
      requestId: 'req-sort-newer-high',
      message: 'newer high priority garrison',
      metadata: {
        playerHistoryCategory: 'ai_activity',
        playerHistoryFactionId: 'qingzhou',
        aiPlayerId: 'ai_qingzhou_frontier_1',
        playerHistoryActorName: '青州前锋营',
        playerHistorySeverity: 'high',
        proposalAction: 'garrison_set',
        worldAction: 'queueTacticalOverride',
      },
    },
    ...[
      ['req-sort-low', '河东浅滩', 'tile-sort-low'],
      ['req-sort-high', '河东粮道', 'tile-sort-high'],
      ['req-sort-newer-high', '河东关口', 'tile-sort-newer-high'],
    ].map(([requestId, target, tileId], index): WorldEventRecord => ({
      id: `event-map-sort-${index + 1}`,
      category: 'world_action',
      action: 'mapTarget',
      success: true,
      tick: 129 + index,
      worldVersion: 40 + index,
      createdAt: `2026-06-19T10:0${index}:30.000Z`,
      requestId,
      message: 'map target context',
      metadata: {
        playerHistoryCategory: 'map_change',
        playerHistoryTarget: target,
        tileId,
      },
    })),
  ],
  limit: 3,
})

assert.deepEqual(
  sortedAggregateFeed.items.map((item) => item.activityEventId),
  ['event-ai-sort-newer-high', 'event-ai-sort-high', 'event-ai-sort-low'],
  'AI activity feed should sort by priority, turn, sequence, then occurredAt',
)
assert.equal(sortedAggregateFeed.sortOrder.primary, 'priority_desc')
assert.equal(sortedAggregateFeed.sortOrder.secondary, 'turn_desc')
assert.equal(sortedAggregateFeed.sortOrder.tertiary, 'sequence_desc')
assert.deepEqual(
  sortedAggregateFeed.mapTargetQueue.map((item) => item.mapTargetTileId),
  ['tile-sort-newer-high', 'tile-sort-high', 'tile-sort-low'],
  'map target queue should preserve sorted activity order for multi-point hotspots',
)
assert.equal(sortedAggregateFeed.mapTargetQueue[0]?.sourceRef.requestId, 'req-sort-newer-high')
const occupyAggregate = sortedAggregateFeed.aggregateGroups.find((group) => group.intentLabel === '占据前线地块')
assert.ok(occupyAggregate, 'same actor and intent should aggregate into a visible activity group')
assert.equal(occupyAggregate?.activityCount, 2)
assert.equal(occupyAggregate?.latestTurn, 130)
assert.equal(occupyAggregate?.priority, 80)
assert.deepEqual(occupyAggregate?.mapTargetTileIds, ['tile-sort-high', 'tile-sort-low'])
assertNoEngineeringLeak(occupyAggregate?.intentLabel ?? '', 'aggregate intent')

const multiActorApiFeed = buildPlayerHistoryAiActivityFeed([
  {
    id: 'event-ai-multi-qingzhou-1',
    category: 'planning',
    action: 'ai_player_execute_proposal',
    success: true,
    tick: 210,
    worldVersion: 6,
    createdAt: '2026-06-19T11:00:00.000Z',
    requestId: 'req-multi-qingzhou-1',
    message: 'qingzhou occupy',
    metadata: {
      playerHistoryCategory: 'ai_activity',
      playerHistoryFactionId: 'qingzhou',
      aiPlayerId: 'ai_qingzhou_frontier_1',
      playerHistoryActorName: '青州前锋营',
      playerHistorySeverity: 'medium',
      proposalAction: 'tile_occupy',
      worldAction: 'occupyTile',
    },
  },
  {
    id: 'event-ai-multi-yanzhou-1',
    category: 'planning',
    action: 'ai_player_execute_proposal',
    success: true,
    tick: 211,
    worldVersion: 8,
    createdAt: '2026-06-19T11:01:00.000Z',
    requestId: 'req-multi-yanzhou-1',
    message: 'yanzhou garrison',
    metadata: {
      playerHistoryCategory: 'ai_activity',
      playerHistoryFactionId: 'yanzhou',
      aiPlayerId: 'ai_yanzhou_guard_1',
      playerHistoryActorName: '兖州守备营',
      playerHistoryTitle: '前线已布防',
      playerHistorySummary: '兖州守备营已布防，防线正在加固。',
      playerHistoryResultLabel: '防线加固',
      playerHistorySeverity: 'high',
      proposalAction: 'garrison_set',
      worldAction: 'queueTacticalOverride',
    },
  },
  {
    id: 'event-ai-multi-yanzhou-2',
    category: 'planning',
    action: 'ai_player_execute_proposal',
    success: true,
    tick: 209,
    worldVersion: 5,
    createdAt: '2026-06-19T10:59:00.000Z',
    requestId: 'req-multi-yanzhou-2',
    message: 'yanzhou occupy',
    metadata: {
      playerHistoryCategory: 'ai_activity',
      playerHistoryFactionId: 'yanzhou',
      aiPlayerId: 'ai_yanzhou_guard_1',
      playerHistoryActorName: '兖州守备营',
      playerHistorySeverity: 'medium',
      proposalAction: 'tile_occupy',
      worldAction: 'occupyTile',
    },
  },
  ...[
    ['req-multi-qingzhou-1', '河东前哨', 'tile-multi-qingzhou-1'],
    ['req-multi-yanzhou-1', '兖州关口', 'tile-multi-yanzhou-1'],
    ['req-multi-yanzhou-2', '兖州渡口', 'tile-multi-yanzhou-2'],
  ].map(([requestId, target, tileId], index): WorldEventRecord => ({
    id: `event-map-multi-${index + 1}`,
    category: 'world_action',
    action: 'mapTarget',
    success: true,
    tick: 209 + index,
    worldVersion: 20 + index,
    createdAt: `2026-06-19T11:0${index}:30.000Z`,
    requestId,
    message: 'multi actor map target',
    metadata: {
      playerHistoryCategory: 'map_change',
      playerHistoryTarget: target,
      tileId,
    },
  })),
])

assert.equal(multiActorApiFeed.contractId, 'player_history_ai_activity_feed_v1')
assert.equal(multiActorApiFeed.actorCount, 2)
assert.deepEqual(multiActorApiFeed.actorIds.sort(), ['ai_qingzhou_frontier_1', 'ai_yanzhou_guard_1'])
assert.equal(multiActorApiFeed.sortOrder.primary, 'priority_desc')
assert.deepEqual(
  multiActorApiFeed.items.map((item) => item.activityEventId),
  ['event-ai-multi-yanzhou-1', 'event-ai-multi-qingzhou-1', 'event-ai-multi-yanzhou-2'],
  'API activity feed should sort multiple actors without losing priority order',
)
assert.deepEqual(
  multiActorApiFeed.mapTargetQueue.map((item) => item.mapTargetTileId),
  ['tile-multi-yanzhou-1', 'tile-multi-qingzhou-1', 'tile-multi-yanzhou-2'],
  'API activity feed should expose sorted multi-point map target queue',
)
assert.deepEqual(
  multiActorApiFeed.aggregateGroups.map((group) => `${group.actorId}:${group.intentLabel}`).sort(),
  [
    'ai_qingzhou_frontier_1:占据前线地块',
    'ai_yanzhou_guard_1:占据前线地块',
    'ai_yanzhou_guard_1:布防前线据点',
  ],
  'API aggregate groups should not merge different actors or intents',
)
const yanzhouOccupyGroup = multiActorApiFeed.aggregateGroups.find((group) => group.actorId === 'ai_yanzhou_guard_1' && group.intentLabel === '占据前线地块')
assert.equal(yanzhouOccupyGroup?.activityCount, 1)
assert.deepEqual(yanzhouOccupyGroup?.mapTargetTileIds, ['tile-multi-yanzhou-2'])
for (const item of multiActorApiFeed.items) {
  assertNoEngineeringLeak(item.title, `${item.activityEventId} API visible title`)
  assertNoEngineeringLeak(item.summary, `${item.activityEventId} API visible summary`)
  assertNoEngineeringLeak(item.intentLabel, `${item.activityEventId} API visible intent`)
  assertNoEngineeringLeak(item.reasonLabel, `${item.activityEventId} API visible reason`)
}

const visibleActionMatrix = [
  {
    proposalAction: 'resource_gather',
    worldAction: 'gatherAiResourceTile',
    title: '军粮已入仓',
    summary: '青州前锋营已在河东粮田完成采集，补给线更稳。',
    resultLabel: '补给增加',
    target: '河东粮田',
    tileId: 'tile-grain-2',
  },
  {
    proposalAction: 'march_move',
    worldAction: 'moveUnit',
    title: '部队正在行军',
    summary: '青州前锋营正向河东渡口推进，路线已标记。',
    resultLabel: '行军中',
    target: '河东渡口',
    tileId: 'tile-ferry-3',
  },
  {
    proposalAction: 'garrison_set',
    worldAction: 'queueTacticalOverride',
    title: '前线已布防',
    summary: '青州前锋营已在河东关口布防，防线正在加固。',
    resultLabel: '防线加固',
    target: '河东关口',
    tileId: 'tile-pass-4',
  },
  {
    proposalAction: 'city_siege',
    worldAction: 'queuePlanExecution',
    title: '城门攻势已展开',
    summary: '青州前锋营已压向河东城门，城防战事正在升级。',
    resultLabel: '攻势进行中',
    target: '河东城门',
    tileId: 'tile-city-gate-5',
  },
]

for (const [index, fixture] of visibleActionMatrix.entries()) {
  const requestId = `req-visible-matrix-${index + 1}`
  const feed = buildPlayerVisibleActivityFeed({
    aiPlayerId: 'ai_qingzhou_frontier_1',
    factionId: 'qingzhou',
    events: [
      {
        id: `event-ai-visible-${index + 1}`,
        category: 'planning',
        action: 'ai_player_execute_proposal',
        success: true,
        tick: 140 + index,
        worldVersion: 50 + index,
        createdAt: `2026-06-19T10:0${index}:00.000Z`,
        requestId,
        message: 'ai visible matrix item',
        metadata: {
          playerHistoryCategory: 'ai_activity',
          playerHistoryFactionId: 'qingzhou',
          aiPlayerId: 'ai_qingzhou_frontier_1',
          playerHistoryActorName: '青州前锋营',
          playerHistoryTitle: fixture.title,
          playerHistorySummary: fixture.summary,
          playerHistoryResultLabel: fixture.resultLabel,
          playerHistorySeverity: 'medium',
          proposalAction: fixture.proposalAction,
          worldAction: fixture.worldAction,
          proposalId: `proposal-visible-${index + 1}`,
        },
      },
      {
        id: `event-map-visible-${index + 1}`,
        category: 'world_action',
        action: fixture.worldAction,
        success: true,
        tick: 140 + index,
        worldVersion: 50 + index,
        createdAt: `2026-06-19T10:0${index}:01.000Z`,
        requestId,
        message: 'map target context',
        metadata: {
          playerHistoryCategory: 'map_change',
          playerHistoryLocation: '河东前线',
          playerHistoryTarget: fixture.target,
          tileId: fixture.tileId,
        },
      },
    ],
    limit: 3,
  })
  const item = feed.items[0]
  assert.equal(feed.count, 1, `${fixture.proposalAction} should enter visible activity feed`)
  assert.equal(item?.activityEventId, `event-ai-visible-${index + 1}`)
  assert.equal(item?.actorName, '青州前锋营')
  assert.equal(item?.actorType, 'ai_player')
  assert.equal(item?.actorId, 'ai_qingzhou_frontier_1')
  assert.equal(item?.title, fixture.title)
  assert.equal(item?.summary, fixture.summary)
  assert.match(item?.intentLabel ?? '', /[\u4e00-\u9fff]/, `${fixture.proposalAction} intent should be Chinese`)
  assert.match(item?.reasonLabel ?? '', /[\u4e00-\u9fff]/, `${fixture.proposalAction} reason should be Chinese`)
  assert.equal(item?.priority, 60)
  assert.equal(item?.turn, 140 + index)
  assert.equal(item?.occurredAt, `2026-06-19T10:0${index}:00.000Z`)
  assert.equal(item?.sequence, (140 + index) * 1000 + (50 + index))
  assert.equal(item?.mapTargetTileId, fixture.tileId)
  assert.equal(item?.jumpTarget?.surface, 'world_map')
  assert.equal(item?.jumpTarget?.targetId, fixture.tileId)
  assert.equal(item?.jumpTarget?.label, fixture.target)
  assert.equal(item?.sourceRef.requestId, requestId)
  assertNoEngineeringLeak(item?.title ?? '', `${fixture.proposalAction} visible title`)
  assertNoEngineeringLeak(item?.summary ?? '', `${fixture.proposalAction} visible summary`)
  assertNoEngineeringLeak(item?.intentLabel ?? '', `${fixture.proposalAction} visible intent`)
  assertNoEngineeringLeak(item?.reasonLabel ?? '', `${fixture.proposalAction} visible reason`)
}

const subjectFeed = buildAiPlayerVisibleActivityFeedFromHistoryAnchors({
  aiPlayerId: 'ai_qingzhou_frontier_1',
  factionId: 'qingzhou',
  actorName: '青州前锋营',
  anchors: [
    {
      cardId: 'world-event-ai-occupy-1',
      createdAt: '2026-06-19T10:00:00.000Z',
      action: 'tile_occupy',
      status: 'completed',
      title: 'AI 行动已完成',
      summary: '行动完成，结果已归档。',
      resultLabel: '已完成',
      severity: 'medium',
      proposalId: 'proposal-hidden-1',
      targetTileId: 'tile-frontier-7',
      sourceRefs: {
        visibility: 'internal_link_only',
        visible: false,
        worldEventId: 'event-ai-occupy-1',
        requestId: 'req-occupy-1',
      },
    },
  ],
})

assert.equal(subjectFeed.contractId, 'ai_player_visible_activity_feed_v1')
assert.equal(subjectFeed.count, 1)
assert.equal(subjectFeed.items[0]?.activityEventId, 'event-ai-occupy-1')
assert.equal(subjectFeed.items[0]?.actorType, 'ai_player')
assert.equal(subjectFeed.items[0]?.actorId, 'ai_qingzhou_frontier_1')
assert.equal(subjectFeed.items[0]?.mapTargetTileId, 'tile-frontier-7')
assert.equal(subjectFeed.items[0]?.jumpTarget?.targetId, 'tile-frontier-7')
assert.equal(subjectFeed.items[0]?.jumpTarget?.surface, 'world_map')
assert.equal(subjectFeed.items[0]?.intentLabel, '占据前线地块')
assert.equal(subjectFeed.items[0]?.reasonLabel, '扩大前线控制')
assert.equal(subjectFeed.items[0]?.priority, 60)
assert.equal(subjectFeed.items[0]?.sequence, 1)
assert.equal(subjectFeed.items[0]?.occurredAt, '2026-06-19T10:00:00.000Z')
assert.equal(subjectFeed.items[0]?.title, '前线已推进')
assert.match(subjectFeed.items[0]?.summary ?? '', /青州前锋营/)
assert.equal(subjectFeed.items[0]?.sourceRef.proposalId, 'proposal-hidden-1')
assert.equal(subjectFeed.items[0]?.sourceRef.requestId, 'req-occupy-1')
assert.equal(subjectFeed.sortOrder.primary, 'priority_desc')
assert.equal(subjectFeed.aggregateGroups[0]?.activityCount, 1)
assert.deepEqual(subjectFeed.aggregateGroups[0]?.mapTargetTileIds, ['tile-frontier-7'])
assert.equal(subjectFeed.mapTargetQueue[0]?.mapTargetTileId, 'tile-frontier-7')
assert.equal(subjectFeed.mapTargetQueue[0]?.sourceRef.requestId, 'req-occupy-1')
assertNoEngineeringLeak(subjectFeed.items[0]?.title ?? '', 'subject activity title')
assertNoEngineeringLeak(subjectFeed.items[0]?.summary ?? '', 'subject activity summary')
assertNoEngineeringLeak(subjectFeed.items[0]?.intentLabel ?? '', 'subject activity intent')
assertNoEngineeringLeak(subjectFeed.items[0]?.reasonLabel ?? '', 'subject activity reason')

const subjectReadModel = readFileSync('server/src/application/ai/aiPlayerSubjectReadModel.ts', 'utf8')
const aiPlayerContracts = readFileSync('shared/contracts/aiPlayer.ts', 'utf8')
const playerHistoryDomain = readFileSync('shared/domain/playerHistory.ts', 'utf8')
const playerHistoryRoute = readFileSync('server/src/routes/playerHistory.ts', 'utf8')
const mainGd = readFileSync('godot-client/scripts/app/main.gd', 'utf8')
const unitViewLayer = readFileSync('godot-client/scripts/map/unit_view_layer.gd', 'utf8')
const validationDoc = readFileSync('docs/parallel-validation/2026-06-19-ai-tile-occupy-living-world-validation.md', 'utf8')
const phase2Doc = readFileSync('docs/parallel-validation/2026-06-19-ai-living-world-phase2.md', 'utf8')

assert.ok(
  subjectReadModel.includes('recentVisibleActivities'),
  'subject read model should expose recentVisibleActivities feed',
)
assert.ok(
  subjectReadModel.includes('requestId: event.requestId'),
  'subject history anchors should preserve requestId for visible activity source refs',
)
assert.ok(
  subjectReadModel.includes('requestId = anchor.sourceRefs.requestId'),
  'subject visible activity source refs should emit requestId',
)
for (const token of ['actorType', 'actorId', 'intentLabel', 'reasonLabel', 'priority', 'sequence', 'occurredAt', 'aggregateGroups', 'mapTargetQueue', 'sortOrder']) {
  assert.ok(aiPlayerContracts.includes(token), `AI visible activity contract should expose ${token}`)
  assert.ok(playerHistoryDomain.includes(token), `playerHistory activity builder should emit ${token}`)
  assert.ok(subjectReadModel.includes(token), `subject visible activity builder should emit ${token}`)
}
assert.ok(
  playerHistoryDomain.includes('buildVisibleActivitySequence'),
  'playerHistory activity builder should derive sortable sequence from turn/world version',
)
assert.ok(
  subjectReadModel.includes('readVisibleActivityPriority'),
  'subject visible activity builder should derive sortable priority from severity',
)
assert.ok(
  playerHistoryRoute.includes('activityFeed: buildPlayerHistoryAiActivityFeed'),
  'playerHistory route should expose supplemental activityFeed for downstream activity list consumers',
)
assert.ok(
  validationDoc.includes('mapTargetTileId'),
  'validation doc should document mapTargetTileId for the living-world loop',
)
for (const token of ['activityEventId', 'mapTargetTileId', 'jumpTarget', 'sourceRef']) {
  assert.ok(unitViewLayer.includes(`"${token}"`), `Godot living activity marker should expose ${token}`)
  assert.ok(mainGd.includes(token), `Godot activity card payload should consume ${token}`)
}
for (const token of ['resource_gather', 'march_move', 'garrison_set', 'city_siege']) {
  assert.ok(phase2Doc.includes(token), `phase2 matrix should document ${token}`)
}
for (const token of ['requestId', 'sourceRef', 'mapTargetTileId']) {
  assert.ok(phase2Doc.includes(token), `phase2 matrix should document ${token}`)
}
assert.ok(
  phase2Doc.includes('不得称 AI 玩家通过'),
  'phase2 matrix should preserve the no-screenshot/no-click acceptance boundary',
)

console.log('[ai_tile_occupy_living_world_loop_contract] dynamic feed chain ok')
