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
const handoffContract = read('server/tests/godot_player_history_share_handoff_ux_static_contract.test.ts')
const managementContract = read('server/tests/godot_player_history_share_management_static_contract.test.ts')

assert.ok(
  packageJson.includes('"test:godot:player-history-share-copy-clipboard-static-contract"'),
  'package.json must expose Godot player-history share copy clipboard static contract',
)

assert.ok(
  authority.includes('Stage 566 Godot player-history share copy clipboard static status') &&
    authority.includes('`npm.cmd run test:godot:player-history-share-copy-clipboard-static-contract`') &&
    handoff.includes('Stage 566 - Godot player-history share copy clipboard bridge'),
  'authority and CURRENT handoff must record Stage 566 share copy clipboard gate',
)

assert.ok(
  handoffContract.includes('_share_tokens_by_event_id[event_id] = issued_token') &&
    managementContract.includes('"player_history_share_management_revoke"'),
  'share copy bridge must build on Stage 562 issued-token handoff and Stage 565 management bridge',
)

for (const stateFact of [
  'var _share_copy_requested_count := 0',
  'var _share_copy_success_count := 0',
  'var _share_copy_feedback_text := ""',
]) {
  assert.ok(playerHistoryPanel.includes(stateFact), `panel should track ${stateFact}`)
}

const visibleLabelSlice = playerHistoryPanel.slice(
  playerHistoryPanel.indexOf('const PLAYER_HISTORY_VISIBLE_LABELS := {'),
  playerHistoryPanel.indexOf('var _backend_api_client'),
)
for (const requiredLabel of [
  '"shareCopy": "复制"',
  '"shareCopied": "分享口令已复制"',
]) {
  assert.ok(visibleLabelSlice.includes(requiredLabel), `visible labels should include ${requiredLabel}`)
}

const rebuildTimeline = functionSource(playerHistoryPanel, 'func _rebuild_timeline(timeline: Dictionary) -> void:')
for (const rendererFact of [
  '"TimelineCardShareCopyButton%02d"',
  '"player_history_timeline_share_copy_clipboard"',
  'share_copy_button.pressed.connect(_on_timeline_share_copy_pressed.bind(share_feedback, share_event_id))',
]) {
  assert.ok(rebuildTimeline.includes(rendererFact), `timeline renderer should include ${rendererFact}`)
}

const copyFlow = functionSource(
  playerHistoryPanel,
  'func _on_timeline_share_copy_pressed(feedback_label: Label, event_id: String) -> void:',
)
for (const copyFact of [
  '_share_copy_requested_count += 1',
  'var issued_token := str(_share_tokens_by_event_id.get(resolved_event_id, "")).strip_edges()',
  'DisplayServer.clipboard_set(issued_token)',
  '_share_copy_success_count += 1',
  'PLAYER_HISTORY_VISIBLE_LABELS.get("shareCopied"',
  'PLAYER_HISTORY_VISIBLE_LABELS.get("shareUnavailable"',
]) {
  assert.ok(copyFlow.includes(copyFact), `copy flow should include ${copyFact}`)
}

const summary = functionSource(playerHistoryPanel, 'func get_player_history_visual_smoke_summary() -> Dictionary:')
for (const summaryFact of [
  '"shareCopyRequestedCount": _share_copy_requested_count',
  '"shareCopySuccessCount": _share_copy_success_count',
  '"shareCopyFeedbackText": _share_copy_feedback_text',
]) {
  assert.ok(summary.includes(summaryFact), `summary should include safe copy field ${summaryFact}`)
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

console.log('[godot_player_history_share_copy_clipboard_static_contract] all checks passed')
