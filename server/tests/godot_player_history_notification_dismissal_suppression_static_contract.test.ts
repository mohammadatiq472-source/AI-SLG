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
const backendApiClient = read('godot-client/scripts/infra/http/backend_api_client.gd')
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const runtimeContract = read('server/tests/player_history_notification_persistence_dedupe_runtime_contract.test.ts')

assert.ok(
  packageJson.includes('"test:godot:player-history-notification-dismissal-suppression-static-contract"'),
  'package.json must expose Godot notification dismissal suppression static contract',
)

assert.ok(
  authority.includes('Stage 551 player-history notification repeated-toast suppression runtime status') &&
    authority.includes('dismissedNotificationDedupeKey') &&
    runtimeContract.includes('historyNotificationSuppressionApplied'),
  'authority and runtime contract must record Stage 551 suppression proof',
)

assert.ok(
  backendApiClient.includes('dismissed_notification_dedupe_keys: Array = []') &&
    backendApiClient.includes('dismissedNotificationDedupeKey=%s') &&
    backendApiClient.includes('normalized_dedupe_key.uri_encode()'),
  'BackendApiClient should pass dismissed notification dedupe keys internally',
)

for (const labelFact of [
  '"notificationDismiss": "知道了"',
  '"notificationDismissed": "已收起提醒"',
]) {
  assert.ok(playerHistoryPanel.includes(labelFact), `visible labels should include ${labelFact}`)
}

for (const stateFact of [
  'var _notification_anchor_dismissed_count := 0',
  'var _dismissed_notification_dedupe_keys: Array[String] = []',
]) {
  assert.ok(playerHistoryPanel.includes(stateFact), `panel should track ${stateFact}`)
}

const refreshBackend = functionSource(playerHistoryPanel, 'func refresh_from_backend(limit: int = 80, replay_request_id: String = "") -> void:')
assert.ok(
  refreshBackend.includes('get_player_history_read_model(limit, replay_request_id, _dismissed_notification_dedupe_keys)'),
  'refresh_from_backend should pass dismissed dedupe keys into BackendApiClient',
)

const summary = functionSource(playerHistoryPanel, 'func get_player_history_visual_smoke_summary() -> Dictionary:')
for (const summaryFact of [
  '"notificationAnchorDismissedCount": _notification_anchor_dismissed_count',
  '"notificationDismissedDedupeKeyCount": _dismissed_notification_dedupe_keys.size()',
]) {
  assert.ok(summary.includes(summaryFact), `summary should expose aggregate ${summaryFact}`)
}

const refreshView = functionSource(playerHistoryPanel, 'func _refresh_view() -> void:')
assert.ok(
  refreshView.includes('_notification_anchor_dismissed_count = 0'),
  'refresh should reset per-view dismissed count while preserving dismissed dedupe key set',
)

const rebuildNotifications = functionSource(playerHistoryPanel, 'func _rebuild_notification_anchors(timeline: Dictionary) -> void:')
for (const rebuildFact of [
  'NotificationAnchorDismissButton%02d',
  'player_history_notification_anchor_dismiss',
  'dismiss_button.pressed.connect(_on_notification_anchor_dismissed.bind(feedback, anchor))',
  'PLAYER_HISTORY_VISIBLE_LABELS.get("notificationDismiss"',
]) {
  assert.ok(rebuildNotifications.includes(rebuildFact), `notification rebuild should include ${rebuildFact}`)
}

const sanitizeNotification = functionSource(playerHistoryPanel, 'func _sanitize_notification_anchor_for_visible_copy(anchor: Dictionary) -> Dictionary:')
assert.ok(
  sanitizeNotification.includes('"dedupeKey": str(anchor.get("dedupeKey", "")).strip_edges()'),
  'notification sanitizer should keep dedupe key only for internal dismissal refresh',
)

const dismissHandler = functionSource(playerHistoryPanel, 'func _on_notification_anchor_dismissed(feedback_label: Label, anchor: Dictionary) -> void:')
for (const dismissFact of [
  'var dedupe_key := str(anchor.get("dedupeKey", "")).strip_edges()',
  'not _dismissed_notification_dedupe_keys.has(dedupe_key)',
  '_dismissed_notification_dedupe_keys.append(dedupe_key)',
  '_notification_anchor_dismissed_count += 1',
  'PLAYER_HISTORY_VISIBLE_LABELS.get("notificationDismissed"',
  'feedback_label.text = _notification_anchor_feedback_text',
]) {
  assert.ok(dismissHandler.includes(dismissFact), `dismiss handler should include ${dismissFact}`)
}

for (const forbiddenVisibleLeak of [
  'dedupeKey',
  'dismissedNotificationDedupeKey',
  '/api/player-history',
  '/api/events',
  'route',
  'debug',
  'ops',
]) {
  assert.equal(rebuildNotifications.includes(forbiddenVisibleLeak), false, `notification visible rebuild must not expose ${forbiddenVisibleLeak}`)
}

console.log('[godot_player_history_notification_dismissal_suppression_static_contract] all checks passed')
