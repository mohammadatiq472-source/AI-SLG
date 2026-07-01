import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function functionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const nextFunc = source.indexOf('\nfunc ', start + signature.length)
  const end = nextFunc > start ? nextFunc : source.length
  return source.slice(start, end)
}

const playerHistoryPanel = read('godot-client/scripts/ui/player_history_panel.gd')
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const historyContract = read('shared/contracts/game/history.ts')
const historyDomain = read('shared/domain/playerHistory.ts')

assert.ok(
  packageJson.includes('"test:godot:player-history-notification-anchor-clickthrough-contract"'),
  'package.json must expose Godot notification anchor click-through contract',
)

assert.ok(
  authority.includes('Stage 546 Godot player-history notification anchor click-through status') &&
    authority.includes('`npm.cmd run test:godot:player-history-notification-anchor-clickthrough-contract`'),
  'authority must record Stage 546 notification click-through gate',
)

assert.ok(
  historyContract.includes("contractId: 'player_history_notification_anchor_v1'") &&
    historyContract.includes('historyNotificationAnchors?: PlayerHistoryNotificationAnchor[]') &&
    historyDomain.includes('historyNotificationAnchors: notificationResult.anchors'),
  'shared history model should expose notification anchors from Stage 545',
)

for (const stateFact of [
  'var _notification_anchor_count := 0',
  'var _notification_anchor_action_count := 0',
  'var _notification_anchor_feedback_text := ""',
  'var _notification_anchor_selected_durable_card_resolved := false',
  'var _timeline_cards_by_id: Dictionary = {}',
]) {
  assert.ok(playerHistoryPanel.includes(stateFact), `PlayerHistoryPanel should track notification state ${stateFact}`)
}

const summary = functionSource(playerHistoryPanel, 'func get_player_history_visual_smoke_summary() -> Dictionary:')
for (const summaryFact of [
  '"notificationAnchorCount": _notification_anchor_count',
  '"notificationAnchorActionCount": _notification_anchor_action_count',
  '"notificationAnchorFeedbackText": _notification_anchor_feedback_text',
  '"notificationAnchorSelectedDurableCardResolved": _notification_anchor_selected_durable_card_resolved',
]) {
  assert.ok(summary.includes(summaryFact), `summary should expose safe notification fact ${summaryFact}`)
}

const refreshView = functionSource(playerHistoryPanel, 'func _refresh_view() -> void:')
assert.ok(
  refreshView.includes('_rebuild_notification_anchors(timeline)') &&
    refreshView.includes('_rebuild_timeline(timeline)') &&
    refreshView.indexOf('_rebuild_notification_anchors(timeline)') < refreshView.indexOf('_rebuild_timeline(timeline)'),
  'PlayerHistoryPanel should render notification anchors before timeline while timeline card map is populated for later clicks',
)

const rebuildTimeline = functionSource(playerHistoryPanel, 'func _rebuild_timeline(timeline: Dictionary) -> void:')
assert.ok(
  rebuildTimeline.includes('_timeline_cards_by_id[card_id] = card.duplicate(true)'),
  'timeline rebuild should keep internal card lookup for notification click-through',
)

const rebuildNotifications = functionSource(playerHistoryPanel, 'func _rebuild_notification_anchors(timeline: Dictionary) -> void:')
for (const notificationFact of [
  'timeline.get("historyNotificationAnchors", [])',
  'NotificationAnchorCard%02d',
  'NotificationAnchorOpenButton%02d',
  'player_history_notification_anchor_open',
  'button.pressed.connect(_on_notification_anchor_pressed.bind(feedback, anchor))',
  '_notification_anchor_count += 1',
  '_notification_anchor_action_count += 1',
]) {
  assert.ok(rebuildNotifications.includes(notificationFact), `notification rebuild should include ${notificationFact}`)
}

const sanitizeNotification = functionSource(playerHistoryPanel, 'func _sanitize_notification_anchor_for_visible_copy(anchor: Dictionary) -> Dictionary:')
for (const safeField of [
  '"title": str(anchor.get("title", "")).strip_edges()',
  '"body": str(anchor.get("body", "")).strip_edges()',
  '"actionLabel": str(anchor.get("actionLabel", "前往大事查看")).strip_edges()',
  '"cooldownLabel": str(anchor.get("cooldownLabel", "")).strip_edges()',
  '"durableCardAnchor": durable_anchor',
]) {
  assert.ok(sanitizeNotification.includes(safeField), `notification sanitizer should keep ${safeField}`)
}

const onNotification = functionSource(playerHistoryPanel, 'func _on_notification_anchor_pressed(feedback_label: Label, anchor: Dictionary) -> void:')
for (const clickFact of [
  'var card := _resolve_timeline_card_from_durable_anchor(durable_anchor)',
  '_notification_anchor_selected_durable_card_resolved = not card.is_empty()',
  'var visible_card := _sanitize_timeline_card_for_visible_copy(card)',
  'var recovery_kind := str(visible_card.get("recoveryActionKind", "")).strip_edges()',
  'var recovery_token := _resolve_timeline_recovery_internal_token(recovery_kind, source_refs)',
  'var recovery_payload := _build_timeline_recovery_focus_payload(visible_card)',
  '_on_timeline_recovery_pressed(feedback_label, recovery_kind, recovery_token, recovery_payload)',
]) {
  assert.ok(onNotification.includes(clickFact), `notification click should include ${clickFact}`)
}

const resolveAnchor = functionSource(playerHistoryPanel, 'func _resolve_timeline_card_from_durable_anchor(durable_anchor: String) -> Dictionary:')
assert.ok(
  resolveAnchor.includes('resolved_anchor.begins_with("timeline-card:")') &&
    resolveAnchor.includes('trim_prefix("timeline-card:")') &&
    resolveAnchor.includes('_timeline_cards_by_id.get(card_id, {})'),
  'notification click-through should resolve only timeline-card anchors',
)

for (const forbiddenVisibleLeak of [
  'dedupeKey',
  'budgetSlot',
  'sourceRefs',
  'contractId',
  'historyDedupeKey',
  'historyNotificationBudget',
  'historyDurableCardAnchor',
  '/api/player-history',
  'route',
  'debug',
  'ops',
]) {
  assert.equal(rebuildNotifications.includes(forbiddenVisibleLeak), false, `notification visible rebuild must not expose ${forbiddenVisibleLeak}`)
}

for (const forbiddenHandlerLeak of [
  'dedupeKey',
  'budgetSlot',
  'contractId',
  'historyDedupeKey',
  'historyNotificationBudget',
  'historyDurableCardAnchor',
  '/api/player-history',
  'route',
  'debug',
  'ops',
]) {
  assert.equal(onNotification.includes(forbiddenHandlerLeak), false, `notification click handler must not expose ${forbiddenHandlerLeak}`)
}

console.log('[godot_player_history_notification_anchor_clickthrough_contract] all checks passed')
