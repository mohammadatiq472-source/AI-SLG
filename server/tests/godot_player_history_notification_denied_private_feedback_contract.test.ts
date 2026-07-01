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
const historyContract = read('shared/contracts/game/history.ts')
const historyDomain = read('shared/domain/playerHistory.ts')
const packageJson = read('package.json')

assert.ok(
  packageJson.includes('"test:godot:player-history-notification-denied-private-feedback-contract"'),
  'package.json must expose notification denied/private feedback contract',
)

assert.ok(
  historyContract.includes("accessState: 'open' | 'private' | 'denied'") &&
    historyContract.includes('accessFeedbackLabel: string') &&
    historyDomain.includes("accessState: 'open'") &&
    historyDomain.includes("accessFeedbackLabel: '已定位提醒'"),
  'notification anchors should carry explicit access state and player-safe feedback label',
)

for (const labelFact of [
  '"notificationPrivate": "这条提醒暂时不可查看"',
  '"notificationDenied": "这条提醒需要更高权限"',
]) {
  assert.ok(playerHistoryPanel.includes(labelFact), `visible labels should include ${labelFact}`)
}

for (const stateFact of [
  'var _notification_anchor_private_feedback_count := 0',
  'var _notification_anchor_denied_feedback_count := 0',
]) {
  assert.ok(playerHistoryPanel.includes(stateFact), `panel should track ${stateFact}`)
}

const summary = functionSource(playerHistoryPanel, 'func get_player_history_visual_smoke_summary() -> Dictionary:')
for (const summaryFact of [
  '"notificationAnchorPrivateFeedbackCount": _notification_anchor_private_feedback_count',
  '"notificationAnchorDeniedFeedbackCount": _notification_anchor_denied_feedback_count',
]) {
  assert.ok(summary.includes(summaryFact), `summary should expose safe aggregate ${summaryFact}`)
}

const refreshView = functionSource(playerHistoryPanel, 'func _refresh_view() -> void:')
for (const resetFact of [
  '_notification_anchor_private_feedback_count = 0',
  '_notification_anchor_denied_feedback_count = 0',
]) {
  assert.ok(refreshView.includes(resetFact), `refresh should reset ${resetFact}`)
}

const sanitizeNotification = functionSource(playerHistoryPanel, 'func _sanitize_notification_anchor_for_visible_copy(anchor: Dictionary) -> Dictionary:')
for (const sanitizeFact of [
  'var access_state := _sanitize_notification_access_state',
  'var access_feedback := _sanitize_notification_access_feedback',
  '"accessState": access_state',
  '"accessFeedbackLabel": access_feedback',
]) {
  assert.ok(sanitizeNotification.includes(sanitizeFact), `notification sanitizer should include ${sanitizeFact}`)
}

const sanitizeState = functionSource(playerHistoryPanel, 'func _sanitize_notification_access_state(access_state: String) -> String:')
assert.ok(
  sanitizeState.includes('resolved == "private" or resolved == "denied"') &&
    sanitizeState.includes('return "open"'),
  'access state sanitizer should clamp unknown state to open',
)

const sanitizeFeedback = functionSource(playerHistoryPanel, 'func _sanitize_notification_access_feedback(access_state: String, access_feedback: String) -> String:')
for (const feedbackFact of [
  'PLAYER_HISTORY_VISIBLE_LABELS.get("notificationPrivate"',
  'PLAYER_HISTORY_VISIBLE_LABELS.get("notificationDenied"',
  'PLAYER_HISTORY_VISIBLE_LABELS.get("notificationReady"',
]) {
  assert.ok(sanitizeFeedback.includes(feedbackFact), `feedback sanitizer should include ${feedbackFact}`)
}

const onNotification = functionSource(playerHistoryPanel, 'func _on_notification_anchor_pressed(feedback_label: Label, anchor: Dictionary) -> void:')
const deniedGuardIndex = onNotification.indexOf('if access_state != "open":')
const durableAnchorIndex = onNotification.indexOf('var durable_anchor := str(anchor.get("durableCardAnchor", "")).strip_edges()')
assert.ok(deniedGuardIndex >= 0, 'notification click should guard non-open access states')
assert.ok(durableAnchorIndex > deniedGuardIndex, 'denied/private feedback must run before durable anchor resolution')

for (const deniedFact of [
  '_notification_anchor_selected_durable_card_resolved = false',
  '_notification_anchor_private_feedback_count += 1',
  '_notification_anchor_denied_feedback_count += 1',
  'feedback_label.text = _notification_anchor_feedback_text',
  'return',
]) {
  assert.ok(onNotification.includes(deniedFact), `non-open notification click should include ${deniedFact}`)
}

for (const forbiddenVisibleLeak of [
  'dedupeKey',
  'budgetSlot',
  'sourceRefs',
  '/api/player-history',
  'route',
  'debug',
  'ops',
]) {
  assert.equal(sanitizeFeedback.includes(forbiddenVisibleLeak), false, `feedback sanitizer must not expose ${forbiddenVisibleLeak}`)
}

console.log('[godot_player_history_notification_denied_private_feedback_contract] all checks passed')
