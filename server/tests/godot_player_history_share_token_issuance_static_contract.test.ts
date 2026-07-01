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
const handoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
const backendRouteContract = read('server/tests/player_history_share_token_issue_runtime_contract.test.ts')

assert.ok(
  packageJson.includes('"test:godot:player-history-share-token-issuance-static-contract"'),
  'package.json must expose Godot player-history share-token issuance static contract',
)

assert.ok(
  authority.includes('Stage 560 Godot player-history share-token issuance bridge status') &&
    authority.includes('`npm.cmd run test:godot:player-history-share-token-issuance-static-contract`') &&
    handoff.includes('Stage 560 - Godot player-history share-token issuance bridge'),
  'authority and CURRENT handoff must record Stage 560 share-token issuance bridge gate',
)

assert.ok(
  backendRouteContract.includes('/api/player-history/share-token') &&
    backendRouteContract.includes('shareToken') &&
    backendRouteContract.includes('explicit_spectator'),
  'Stage 559 backend share-token issuance route must be proven before the Godot bridge',
)

const clientHelper = functionSource(
  backendApiClient,
  'func post_player_history_share_token(event_id: String, faction_id: String = "player", ttl_ms: int = 300000) -> Dictionary:',
)

for (const clientFact of [
  '"error": "missing_player_history_event_id"',
  'var session_token := SessionStore.token.strip_edges()',
  'extra_headers["Authorization"] = "Bearer %s" % session_token',
  '"/api/player-history/share-token?eventId=%s&factionId=%s"',
  'normalized_id.uri_encode()',
  'normalized_faction_id.uri_encode()',
  '"ttlMs": ttl_ms',
]) {
  assert.ok(clientHelper.includes(clientFact), `BackendApiClient helper should include ${clientFact}`)
}

const visibleLabelSlice = playerHistoryPanel.slice(
  playerHistoryPanel.indexOf('const PLAYER_HISTORY_VISIBLE_LABELS := {'),
  playerHistoryPanel.indexOf('var _backend_api_client'),
)
for (const requiredLabel of [
  '"shareTimeline": "分享"',
  '"shareReady": "已开放只读纪事"',
  '"shareUnavailable": "暂时无法分享"',
]) {
  assert.ok(visibleLabelSlice.includes(requiredLabel), `visible labels should include ${requiredLabel}`)
}

const rebuildTimeline = functionSource(playerHistoryPanel, 'func _rebuild_timeline(timeline: Dictionary) -> void:')
for (const rebuildFact of [
  'var share_event_id := _resolve_timeline_share_event_id(card)',
  '"TimelineCardShareButton%02d"',
  '"TimelineCardShareFeedback%02d"',
  '"player_history_timeline_share_token_issue"',
  'share_button.pressed.connect(_on_timeline_share_pressed.bind(share_feedback, share_event_id))',
]) {
  assert.ok(rebuildTimeline.includes(rebuildFact), `timeline renderer should include ${rebuildFact}`)
}

const shareResolver = functionSource(playerHistoryPanel, 'func _resolve_timeline_share_event_id(card: Dictionary) -> String:')
assert.ok(
  shareResolver.includes('var share_policy := str(card.get("sharePolicy", "")).strip_edges()') &&
    shareResolver.includes('if share_policy != "explicit_spectator":') &&
    shareResolver.includes('source_refs.get("worldEventId", "")'),
  'share resolver should require explicit share policy and use internal world event id',
)

const shareHandler = functionSource(playerHistoryPanel, 'func _on_timeline_share_pressed(feedback_label: Label, event_id: String) -> void:')
for (const handlerFact of [
  '_share_issue_requested_count += 1',
  'PLAYER_HISTORY_VISIBLE_LABELS.get("shareUnavailable"',
  'call_deferred("_issue_timeline_share_token", feedback_label, resolved_event_id)',
]) {
  assert.ok(shareHandler.includes(handlerFact), `share handler should include ${handlerFact}`)
}

const shareIssue = functionSource(playerHistoryPanel, 'func _issue_timeline_share_token(feedback_label: Label, event_id: String) -> void:')
for (const issueFact of [
  'post_player_history_share_token(event_id, "player", 300000)',
  'str(data.get("shareToken", "")).strip_edges()',
  '_share_issue_success_count += 1',
  '_share_issue_scope = str(data.get("sharedScope", "")).strip_edges()',
  '_share_issue_retention_label = str(data.get("shareRetentionLabel", "")).strip_edges()',
  '_share_issue_feedback_text = str(data.get("shareStateLabel", PLAYER_HISTORY_VISIBLE_LABELS.get("shareReady"',
]) {
  assert.ok(shareIssue.includes(issueFact), `share issue flow should include ${issueFact}`)
}

const summary = functionSource(playerHistoryPanel, 'func get_player_history_visual_smoke_summary() -> Dictionary:')
for (const summaryFact of [
  '"shareIssueRequestedCount": _share_issue_requested_count',
  '"shareIssueSuccessCount": _share_issue_success_count',
  '"shareIssueFeedbackText": _share_issue_feedback_text',
  '"shareIssueScope": _share_issue_scope',
  '"shareIssueRetentionLabel": _share_issue_retention_label',
]) {
  assert.ok(summary.includes(summaryFact), `summary should include safe aggregate field ${summaryFact}`)
}

for (const forbiddenVisibleLeak of [
  'shareToken',
  'eventId',
  '/api/player-history/share-token',
  'Authorization',
  'Bearer',
  'SessionStore',
  'missing_player_history_event_id',
]) {
  assert.equal(visibleLabelSlice.includes(forbiddenVisibleLeak), false, `visible labels must not expose ${forbiddenVisibleLeak}`)
  assert.equal(rebuildTimeline.includes(forbiddenVisibleLeak), false, `timeline visible renderer must not expose ${forbiddenVisibleLeak}`)
}

console.log('[godot_player_history_share_token_issuance_static_contract] all checks passed')
