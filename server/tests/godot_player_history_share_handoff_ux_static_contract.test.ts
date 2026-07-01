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
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const handoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
const issuanceContract = read('server/tests/godot_player_history_share_token_issuance_static_contract.test.ts')
const readContract = read('server/tests/godot_player_history_share_token_read_static_contract.test.ts')

assert.ok(
  packageJson.includes('"test:godot:player-history-share-handoff-ux-static-contract"'),
  'package.json must expose Godot player-history share handoff UX static contract',
)

assert.ok(
  authority.includes('Stage 562 Godot player-history share handoff UX status') &&
    authority.includes('`npm.cmd run test:godot:player-history-share-handoff-ux-static-contract`') &&
    handoff.includes('Stage 562 - Godot player-history share handoff UX'),
  'authority and CURRENT handoff must record Stage 562 share handoff UX gate',
)

assert.ok(
  issuanceContract.includes('post_player_history_share_token(event_id, "player", 300000)') &&
    readContract.includes('get_shared_player_history_read_model(resolved_share_token, limit)'),
  'handoff UX must build on the Stage 560 issuance bridge and Stage 561 shared-read bridge',
)

for (const stateFact of [
  'var _share_tokens_by_event_id: Dictionary = {}',
  'var _share_handoff_ready_count := 0',
  'var _share_handoff_preview_requested_count := 0',
  'var _share_handoff_preview_success_count := 0',
  'var _share_handoff_feedback_text := ""',
  'var _share_handoff_retention_label := ""',
  'var _share_handoff_preview_active := false',
]) {
  assert.ok(playerHistoryPanel.includes(stateFact), `panel should track ${stateFact}`)
}

const visibleLabelSlice = playerHistoryPanel.slice(
  playerHistoryPanel.indexOf('const PLAYER_HISTORY_VISIBLE_LABELS := {'),
  playerHistoryPanel.indexOf('var _backend_api_client'),
)
for (const requiredLabel of [
  '"shareHandoffReady": "分享已准备"',
  '"shareHandoffPreview": "预览"',
  '"shareHandoffPreviewReady": "只读预览已打开"',
]) {
  assert.ok(visibleLabelSlice.includes(requiredLabel), `visible labels should include ${requiredLabel}`)
}

const rebuildTimeline = functionSource(playerHistoryPanel, 'func _rebuild_timeline(timeline: Dictionary) -> void:')
for (const rendererFact of [
  '"TimelineCardSharePreviewButton%02d"',
  '"player_history_timeline_share_handoff_preview"',
  'share_preview_button.pressed.connect(_on_timeline_share_handoff_preview_pressed.bind(share_feedback, share_event_id))',
]) {
  assert.ok(rebuildTimeline.includes(rendererFact), `timeline renderer should include ${rendererFact}`)
}

const issueFlow = functionSource(playerHistoryPanel, 'func _issue_timeline_share_token(feedback_label: Label, event_id: String) -> void:')
for (const issueFact of [
  'var issued_token := str(data.get("shareToken", "")).strip_edges()',
  '_share_tokens_by_event_id[event_id] = issued_token',
  '_share_handoff_ready_count += 1',
  '_share_handoff_retention_label = _share_issue_retention_label',
  'PLAYER_HISTORY_VISIBLE_LABELS.get("shareHandoffReady"',
  'feedback_label.text = _share_handoff_feedback_text if _share_handoff_feedback_text.strip_edges() != "" else _share_issue_feedback_text',
]) {
  assert.ok(issueFlow.includes(issueFact), `issue flow should include ${issueFact}`)
}

const previewFlow = functionSource(
  playerHistoryPanel,
  'func _on_timeline_share_handoff_preview_pressed(feedback_label: Label, event_id: String) -> void:',
)
for (const previewFact of [
  '_share_handoff_preview_requested_count += 1',
  'var issued_token := str(_share_tokens_by_event_id.get(resolved_event_id, "")).strip_edges()',
  'await open_shared_player_history(issued_token, 80)',
  '_share_handoff_preview_active = _shared_history_read_active',
  '_share_handoff_preview_success_count += 1',
  'PLAYER_HISTORY_VISIBLE_LABELS.get("shareHandoffPreviewReady"',
  'PLAYER_HISTORY_VISIBLE_LABELS.get("sharedReadUnavailable"',
]) {
  assert.ok(previewFlow.includes(previewFact), `preview flow should include ${previewFact}`)
}

const summary = functionSource(playerHistoryPanel, 'func get_player_history_visual_smoke_summary() -> Dictionary:')
for (const summaryFact of [
  '"shareHandoffReadyCount": _share_handoff_ready_count',
  '"shareHandoffPreviewRequestedCount": _share_handoff_preview_requested_count',
  '"shareHandoffPreviewSuccessCount": _share_handoff_preview_success_count',
  '"shareHandoffFeedbackText": _share_handoff_feedback_text',
  '"shareHandoffRetentionLabel": _share_handoff_retention_label',
  '"shareHandoffPreviewActive": _share_handoff_preview_active',
]) {
  assert.ok(summary.includes(summaryFact), `summary should include safe handoff field ${summaryFact}`)
}

for (const forbiddenVisibleLeak of [
  'shareToken',
  'issued_token',
  '_share_tokens_by_event_id',
  '/api/player-history',
  'Authorization',
  'Bearer',
  'SessionStore',
  'explicit_spectator',
]) {
  assert.equal(visibleLabelSlice.includes(forbiddenVisibleLeak), false, `visible labels must not expose ${forbiddenVisibleLeak}`)
  assert.equal(rebuildTimeline.includes(forbiddenVisibleLeak), false, `timeline renderer must not expose ${forbiddenVisibleLeak}`)
}

for (const forbiddenSummaryLeak of [
  'shareToken',
  'issued_token',
  '_share_tokens_by_event_id',
]) {
  assert.equal(summary.includes(forbiddenSummaryLeak), false, `summary must not expose ${forbiddenSummaryLeak}`)
}

console.log('[godot_player_history_share_handoff_ux_static_contract] all checks passed')
