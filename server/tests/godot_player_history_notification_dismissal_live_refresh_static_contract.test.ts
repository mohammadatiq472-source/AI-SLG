import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function functionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const nextFunc = source.indexOf('\nfunc ', start + signature.length)
  const nextStaticFunc = source.indexOf('\nstatic func ', start + signature.length)
  const candidates = [nextFunc, nextStaticFunc].filter((index) => index > start)
  const end = candidates.length > 0 ? Math.min(...candidates) : source.length
  return source.slice(start, end)
}

const playerHistoryPanel = read('godot-client/scripts/ui/player_history_panel.gd')
const backendApiClient = read('godot-client/scripts/infra/http/backend_api_client.gd')
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')

assert.ok(
  packageJson.includes('"test:godot:player-history-notification-dismissal-live-refresh-static-contract"'),
  'package.json must expose Godot notification dismissal live refresh static contract',
)

assert.ok(
  authority.includes('Stage 554 Godot authenticated notification preference bridge status') &&
    backendApiClient.includes('extra_headers["Authorization"] = "Bearer %s" % session_token'),
  'Stage 554 authenticated preference bridge must exist before live dismissal refresh static proof',
)

for (const stateFact of [
  'var _notification_anchor_dismiss_refresh_requested_count := 0',
  'var _notification_anchor_dismiss_refresh_in_flight := false',
]) {
  assert.ok(playerHistoryPanel.includes(stateFact), `panel should track ${stateFact}`)
}

const summary = functionSource(playerHistoryPanel, 'func get_player_history_visual_smoke_summary() -> Dictionary:')
assert.ok(
  summary.includes('"notificationAnchorDismissRefreshRequestedCount": _notification_anchor_dismiss_refresh_requested_count'),
  'summary should expose aggregate dismissal refresh request count without exposing keys',
)

const dismissHandler = functionSource(playerHistoryPanel, 'func _on_notification_anchor_dismissed(feedback_label: Label, anchor: Dictionary) -> void:')
for (const dismissFact of [
  'var dedupe_key := str(anchor.get("dedupeKey", "")).strip_edges()',
  'not _dismissed_notification_dedupe_keys.has(dedupe_key)',
  '_dismissed_notification_dedupe_keys.append(dedupe_key)',
  '_notification_anchor_dismiss_refresh_requested_count += 1',
  'call_deferred("_refresh_after_notification_dismissal")',
  '_notification_anchor_dismissed_count += 1',
  'PLAYER_HISTORY_VISIBLE_LABELS.get("notificationDismissed"',
]) {
  assert.ok(dismissHandler.includes(dismissFact), `dismiss handler should include ${dismissFact}`)
}

const refreshAfterDismissal = functionSource(playerHistoryPanel, 'func _refresh_after_notification_dismissal() -> void:')
for (const refreshFact of [
  'if _notification_anchor_dismiss_refresh_in_flight:',
  'return',
  '_notification_anchor_dismiss_refresh_in_flight = true',
  'await refresh_from_backend()',
  '_notification_anchor_dismiss_refresh_in_flight = false',
]) {
  assert.ok(refreshAfterDismissal.includes(refreshFact), `dismiss refresh should include ${refreshFact}`)
}

const refreshBackend = functionSource(playerHistoryPanel, 'func refresh_from_backend(limit: int = 80, replay_request_id: String = "") -> void:')
assert.ok(
  refreshBackend.includes('get_player_history_read_model(limit, replay_request_id, _dismissed_notification_dedupe_keys)'),
  'dismissal live refresh should reuse authenticated player-history read model refresh with dismissed keys',
)

const visibleLabelSlice = playerHistoryPanel.slice(
  playerHistoryPanel.indexOf('const PLAYER_HISTORY_VISIBLE_LABELS := {'),
  playerHistoryPanel.indexOf('var _backend_api_client'),
)
for (const forbiddenVisibleLeak of [
  'Authorization',
  'Bearer',
  'SessionStore',
  'token',
  'dismissedNotificationDedupeKey',
  'dedupeKey',
  '/api/player-history',
  'route',
  'debug',
  'ops',
]) {
  assert.equal(
    visibleLabelSlice.includes(forbiddenVisibleLeak),
    false,
    `player-visible labels must not expose dismissal refresh internals: ${forbiddenVisibleLeak}`,
  )
}

console.log('[godot_player_history_notification_dismissal_live_refresh_static_contract] all checks passed')
