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

const backendApiClient = read('godot-client/scripts/infra/http/backend_api_client.gd')
const playerHistoryPanel = read('godot-client/scripts/ui/player_history_panel.gd')
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const serverPreferenceContract = read('server/tests/player_history_notification_server_preference_runtime_contract.test.ts')

assert.ok(
  packageJson.includes('"test:godot:player-history-authenticated-notification-preference-static-contract"'),
  'package.json must expose the Godot authenticated notification preference static contract',
)

assert.ok(
  authority.includes('Stage 553 player-history notification server preference persistence status') &&
    serverPreferenceContract.includes('playerHistoryDismissedNotificationDedupeKeys') &&
    serverPreferenceContract.includes('restored backend should suppress dismissed notification'),
  'authority and runtime contract must record Stage 553 server-side preference persistence proof',
)

const readModelHelper = functionSource(
  backendApiClient,
  'func get_player_history_read_model(limit: int = 80, replay_request_id: String = "", dismissed_notification_dedupe_keys: Array = []) -> Dictionary:',
)

for (const required of [
  'var extra_headers: Dictionary = {}',
  'var session_token := SessionStore.token.strip_edges()',
  'if session_token != "":',
  'extra_headers["Authorization"] = "Bearer %s" % session_token',
  'dismissedNotificationDedupeKey=%s',
  'normalized_dedupe_key.uri_encode()',
  'return await request_json("GET", "/api/player-history?%s" % "&".join(query_parts), null, extra_headers)',
]) {
  assert.ok(readModelHelper.includes(required), `player-history helper should include ${required}`)
}

const refreshBackend = functionSource(playerHistoryPanel, 'func refresh_from_backend(limit: int = 80, replay_request_id: String = "") -> void:')
assert.ok(
  refreshBackend.includes('get_player_history_read_model(limit, replay_request_id, _dismissed_notification_dedupe_keys)'),
  'PlayerHistoryPanel refresh should keep sending dismissed dedupe keys through the authenticated helper',
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
    `player-visible labels must not expose authenticated notification internals: ${forbiddenVisibleLeak}`,
  )
}

console.log('[godot_player_history_authenticated_notification_preference_static_contract] all checks passed')
