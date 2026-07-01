import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const FORBIDDEN_PLAYER_VISIBLE_TERMS = [
  'tile_occupy',
  'proposal',
  'receipt',
  'read model',
  'authority',
  'tier',
  'marker',
  'badge',
]

function assertPlayerCopy(value: string, label: string) {
  assert.match(value, /[\u4e00-\u9fff]/, `${label} should be Chinese player-facing copy`)
  for (const token of FORBIDDEN_PLAYER_VISIBLE_TERMS) {
    assert.equal(
      value.toLowerCase().includes(token),
      false,
      `${label} should not leak engineering term: ${token}`,
    )
  }
}

const visibleActivityItem = {
  activityEventId: 'event-ai-occupy-1',
  actorName: '青州前锋营',
  title: '前线已推进',
  summary: '青州前锋营已进驻河东据点，前线归属已经刷新。',
  resultLabel: '已占住',
  severity: 'medium',
  createdAt: '2026-06-19T10:00:00.000Z',
  mapTargetTileId: 'tile-frontier-7',
  jumpTarget: {
    surface: 'world_map',
    targetId: 'tile-frontier-7',
    label: '河东据点',
  },
  sourceRef: {
    visibility: 'internal_link_only',
    visible: false,
    worldEventId: 'event-ai-occupy-1',
    requestId: 'req-occupy-1',
  },
}

assertPlayerCopy(visibleActivityItem.title, 'activity title')
assertPlayerCopy(visibleActivityItem.summary, 'activity summary')
assert.equal(visibleActivityItem.mapTargetTileId, visibleActivityItem.jumpTarget.targetId)
assert.equal(visibleActivityItem.jumpTarget.surface, 'world_map')
assert.equal(visibleActivityItem.sourceRef.visible, false)
assert.equal(visibleActivityItem.sourceRef.worldEventId, visibleActivityItem.activityEventId)

const godotMarkerInput = {
  activityEventId: visibleActivityItem.activityEventId,
  mapTargetTileId: visibleActivityItem.mapTargetTileId,
  jumpTarget: visibleActivityItem.jumpTarget,
  sourceRef: visibleActivityItem.sourceRef,
  title: visibleActivityItem.title,
  summary: visibleActivityItem.summary,
}

assert.deepEqual(godotMarkerInput.jumpTarget, {
  surface: 'world_map',
  targetId: 'tile-frontier-7',
  label: '河东据点',
})
assert.equal(godotMarkerInput.sourceRef.requestId, 'req-occupy-1')

const unitViewLayer = readFileSync('godot-client/scripts/map/unit_view_layer.gd', 'utf8')
const mainGd = readFileSync('godot-client/scripts/app/main.gd', 'utf8')
const aiMapIntentMarker = readFileSync('godot-client/scripts/map/ai_map_intent_marker.gd', 'utf8')
const validationDoc = readFileSync('docs/parallel-validation/2026-06-19-ai-tile-occupy-living-world-validation.md', 'utf8')
const phase2Doc = readFileSync('docs/parallel-validation/2026-06-19-ai-living-world-phase2.md', 'utf8')

for (const field of ['"activityEventId"', '"mapTargetTileId"', '"jumpTarget"', '"sourceRef"']) {
  assert.ok(unitViewLayer.includes(field), `unit_view_layer.gd should pass through ${field}`)
}
for (const field of ['activityEventId', 'mapTargetTileId', 'jumpTarget', 'sourceRef']) {
  assert.ok(mainGd.includes(field), `main.gd activity card should consume ${field}`)
}

for (const metaKey of ['activity_event_id', 'map_target_tile_id', 'jump_target', 'source_ref']) {
  assert.ok(unitViewLayer.includes(metaKey), `living activity marker meta should include ${metaKey}`)
}

assert.ok(
  unitViewLayer.includes('_build_ai_living_activity_marker_request_payload'),
  'unit view layer should expose marker request payload for click/summary consumers',
)
assert.ok(
  unitViewLayer.includes('ai_living_activity_marker_requested.emit(payload)'),
  'unit view layer should emit marker payload for activity card consumers',
)
for (const field of [
  '"jumpTargetReady"',
  '"focusExpectation"',
  '"focusExpectationReady"',
  '"focusExpectationTargetId"',
  '"focusExpectationSurface"',
  '"focusExpectationRequiresRuntimeClick"',
  '"focusExpectationFocusPerformed"',
  '"sourceRefRequestId"',
]) {
  assert.ok(
    unitViewLayer.includes(field),
    `unit view layer marker payload should expose ${field} for later map jump/focus validation`,
  )
}
for (const field of [
  'aiActivityMarkerJumpTargetReady',
  'aiActivityMarkerFocusExpectationReady',
  'aiActivityMarkerFocusExpectationTargetIds',
  'aiActivityMarkerFocusExpectationRequiresRuntimeClick',
  'aiActivityMarkerFocusExpectationFocusPerformed',
]) {
  assert.ok(
    unitViewLayer.includes(field),
    `unit view layer summary should expose ${field} without claiming runtime focus is complete`,
  )
}
assert.ok(
  mainGd.includes('_merge_ai_activity_marker_payload_into_card_payload'),
  'main.gd should merge marker payload into the player-visible activity card payload',
)
assert.ok(
  mainGd.includes('aiActivityCardActivityListPayloadReady'),
  'main.gd should expose a static summary flag for activity-list payload readiness',
)
for (const field of [
  'aiActivityCardJumpTargetReady',
  'aiActivityCardFocusExpectationReady',
  'aiActivityCardFocusExpectationTargetId',
  'aiActivityCardFocusExpectationSurface',
  'aiActivityCardFocusExpectationRequiresRuntimeClick',
  'aiActivityCardFocusExpectationFocusPerformed',
  'aiActivityCardFocusAttempted',
  'aiActivityCardFocusPerformed',
  'aiActivityCardFocusTargetTileId',
  'aiActivityCardFocusReason',
  'aiActivityCardSourceRefRequestId',
]) {
  assert.ok(
    mainGd.includes(field),
    `main.gd activity card summary should expose ${field} without claiming real map focus happened`,
  )
}
assert.ok(
  mainGd.includes('_build_ai_activity_card_focus_expectation'),
  'main.gd should build static focus expectation from jumpTarget/mapTargetTileId',
)
assert.ok(
  mainGd.includes('_open_ai_activity_card_and_focus_from_marker_payload'),
  'main.gd should route marker clicks through an activity-card focus action path',
)
assert.ok(
  mainGd.includes('_focus_ai_activity_target_from_payload'),
  'main.gd should focus a real map target from jumpTarget/mapTargetTileId when marker payload is clicked',
)
assert.ok(
  mainGd.includes('AIActivityCardFocusButton') && mainGd.includes('定位'),
  'AI activity card should expose a player-visible Chinese focus action button.',
)
assert.ok(
  mainGd.includes('AIActivityListItemButton'),
  'AI activity list should expose a true clickable list item entry before the card is opened.',
)
assert.ok(
  mainGd.includes('_on_ai_activity_list_item_pressed') &&
    mainGd.includes('_open_ai_activity_card_from_activity_list_item'),
  'AI activity list item should open the activity card through a dedicated click path.',
)
for (const field of [
  'aiActivityListItemVisible',
  'aiActivityListItemText',
  'aiActivityListItemActionId',
  'aiActivityListItemClickAttempted',
  'aiActivityListItemCardOpened',
  'aiActivityListItemFocusAttempted',
  'aiActivityListItemFocusPerformed',
  'aiActivityListItemSourceRefRequestId',
  'aiActivityListItemFocusReason',
]) {
  assert.ok(
    mainGd.includes(field),
    `main.gd activity list summary should expose ${field} without claiming real map focus happened`,
  )
}
assert.ok(
  mainGd.includes('_on_ai_activity_card_focus_pressed'),
  'AI activity card focus button should route through the same focus action path.',
)
assert.ok(
  mainGd.includes('_build_ai_activity_card_focus_payload_from_card_state'),
  'AI activity card should build focus payload from card state for card/list entry focus.',
)
assert.ok(
  mainGd.includes('payload["activityEventId"]') &&
    mainGd.includes('payload["mapTargetTileId"]') &&
    mainGd.includes('payload["jumpTarget"]') &&
    mainGd.includes('payload["sourceRef"]'),
  'AI activity card trace payload must preserve activity/map/jump/source fields for card/list focus.',
)
assert.ok(
  mainGd.includes('_focus_mainline_visual_smoke_map_unit_tile(focus_target_tile_id)'),
  'AI activity focus action should reuse the existing map focus/select path instead of inventing a fake focus flag',
)
assert.ok(
  mainGd.includes('"aiActivityCardFocusExpectationFocusPerformed": false'),
  'main.gd should not pretend map focus has happened before a runtime click',
)
assert.equal(
  mainGd.includes('"aiActivityCardFocusPerformed": true'),
  false,
  'main.gd should not hard-code real focus success in the summary',
)
assert.equal(
  mainGd.includes('"aiActivityListItemFocusPerformed": true'),
  false,
  'main.gd should not hard-code list item focus success in the summary',
)
assert.ok(
  mainGd.includes('func _format_ai_activity_card_source_copy'),
  'main.gd should translate raw activity-card source ids into player-facing Chinese copy',
)
assert.ok(
  mainGd.includes('"地图热点"') && mainGd.includes('"活动提醒"') && mainGd.includes('"活动线索"'),
  'activity card source copy should include Chinese labels for marker, badge, and unknown sources',
)
assert.equal(
  mainGd.includes('_ai_activity_card_source_label.text = "入口：%s · 执行流 %d 条"'),
  false,
  'activity card source label should not interpolate raw source ids into player-visible copy',
)
assert.ok(
  aiMapIntentMarker.includes('KIND_LIVING_ACTIVITY'),
  'AI map marker renderer should retain the living activity marker kind',
)
assert.ok(
  validationDoc.includes('Godot 最小消费链进入静态可验'),
  'validation doc should record the current Godot static-consumption status',
)
assert.ok(
  phase2Doc.includes('aiActivityCardFocusExpectationFocusPerformed = false') &&
    phase2Doc.includes('aiActivityMarkerFocusExpectationFocusPerformed = false'),
  'Phase2 doc should record that focus expectation readiness is static and does not claim real map focus',
)
assert.ok(
  phase2Doc.includes('aiActivityCardFocusAttempted') &&
    phase2Doc.includes('aiActivityCardFocusPerformed') &&
    phase2Doc.includes('aiActivityCardFocusTargetTileId'),
  'Phase2 doc should record the real focus action summary fields required for the next Godot pass',
)
assert.ok(
  phase2Doc.includes('AIActivityCardFocusButton') &&
    phase2Doc.includes('world_ai_activity_card_from_badge_fixture'),
  'Phase2 doc should record the card/list focus action and next Godot click fixture.',
)
assert.ok(
  phase2Doc.includes('AIActivityListItemButton') &&
    phase2Doc.includes('world_ai_activity_card_from_list_item_fixture'),
  'Phase2 doc should record the activity-list click entry and next Godot click fixture.',
)

console.log('[godot_ai_tile_occupy_living_world_visible_contract] static visible chain ok')
