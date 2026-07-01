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
const historyContracts = read('shared/contracts/game/history.ts')
const historyDomain = read('shared/domain/playerHistory.ts')
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')

assert.ok(
  packageJson.includes('"test:godot:player-history-live-preview-static-contract"'),
  'package.json must expose Godot live-preview static contract',
)

assert.ok(
  historyContracts.includes("contractId: 'player_history_live_preview_v1'") &&
    historyContracts.includes('livePreview?: PlayerHistoryLivePreviewReadModel') &&
    historyDomain.includes('buildPlayerHistoryLivePreviewReadModel'),
  'shared history model should expose livePreview read model from Stage 549',
)

assert.ok(
  authority.includes('Stage 549 player-history live-preview opt-in/backpressure runtime status') &&
    authority.includes('`npm.cmd run test:world:player-history-event-stream-runtime-clamp-contract`'),
  'authority must record Stage 549 live-preview runtime gate',
)

for (const labelFact of [
  '"livePreview": "新动态"',
  '"livePreviewReady": "实时预览已开启"',
]) {
  assert.ok(playerHistoryPanel.includes(labelFact), `visible labels should include ${labelFact}`)
}

for (const stateFact of [
  'var _live_preview_visible := false',
  'var _live_preview_backpressure_applied := false',
  'var _live_preview_collapsed_feedback_text := ""',
  'var _live_preview_dropped_count_label := ""',
  'var _live_preview_card_count := 0',
]) {
  assert.ok(playerHistoryPanel.includes(stateFact), `PlayerHistoryPanel should track ${stateFact}`)
}

const summary = functionSource(playerHistoryPanel, 'func get_player_history_visual_smoke_summary() -> Dictionary:')
for (const summaryFact of [
  '"livePreviewVisible": _live_preview_visible',
  '"livePreviewBackpressureApplied": _live_preview_backpressure_applied',
  '"livePreviewCollapsedFeedbackText": _live_preview_collapsed_feedback_text',
  '"livePreviewDroppedCountLabel": _live_preview_dropped_count_label',
  '"livePreviewCardCount": _live_preview_card_count',
]) {
  assert.ok(summary.includes(summaryFact), `summary should expose safe live-preview aggregate ${summaryFact}`)
}

const refreshView = functionSource(playerHistoryPanel, 'func _refresh_view() -> void:')
for (const refreshFact of [
  '_live_preview_visible = false',
  '_live_preview_backpressure_applied = false',
  '_live_preview_collapsed_feedback_text = ""',
  '_live_preview_dropped_count_label = ""',
  '_live_preview_card_count = 0',
  '_rebuild_live_preview(_coerce_dictionary(_read_model.get("livePreview", {})))',
]) {
  assert.ok(refreshView.includes(refreshFact), `refresh should include ${refreshFact}`)
}
assert.ok(
  refreshView.indexOf('_rebuild_live_preview') < refreshView.indexOf('_rebuild_notification_anchors'),
  'live preview should render before notifications and timeline cards',
)

const rebuildLivePreview = functionSource(playerHistoryPanel, 'func _rebuild_live_preview(live_preview: Dictionary) -> void:')
for (const rebuildFact of [
  '_sanitize_live_preview_for_visible_copy(live_preview)',
  'LivePreviewSummaryCard',
  'PLAYER_HISTORY_VISIBLE_LABELS.get("livePreview"',
  '_live_preview_visible = true',
  '_live_preview_backpressure_applied = bool(visible_preview.get("backpressureApplied", false))',
  '_live_preview_collapsed_feedback_text = str(visible_preview.get("collapsedFeedbackLabel", "")).strip_edges()',
  '_live_preview_dropped_count_label = str(visible_preview.get("droppedCountLabel", "")).strip_edges()',
  '_live_preview_card_count = int(visible_preview.get("previewCardCount", 0))',
]) {
  assert.ok(rebuildLivePreview.includes(rebuildFact), `live-preview rebuild should include ${rebuildFact}`)
}

const sanitizeLivePreview = functionSource(playerHistoryPanel, 'func _sanitize_live_preview_for_visible_copy(live_preview: Dictionary) -> Dictionary:')
for (const sanitizeFact of [
  'contract_id != "player_history_live_preview_v1"',
  'if not bool(live_preview.get("enabled", false))',
  'if not bool(live_preview.get("optInRequired", false))',
  'if not bool(live_preview.get("rawStreamDefaultDenied", false))',
  '"visibleStateLabel": str(live_preview.get("visibleStateLabel"',
  '"collapsedFeedbackLabel": str(live_preview.get("collapsedFeedbackLabel"',
  '"droppedCountLabel": str(live_preview.get("droppedCountLabel", "")).strip_edges()',
  '"previewCardCount": int(live_preview.get("previewCardCount", 0))',
  '"backpressureApplied": bool(live_preview.get("backpressureApplied", false))',
]) {
  assert.ok(sanitizeLivePreview.includes(sanitizeFact), `live-preview sanitizer should include ${sanitizeFact}`)
}

for (const forbiddenVisibleLeak of [
  '/api/events',
  '/api/events/stream',
  'SSE',
  'raw event',
  'backend timing',
  'route',
  'debug',
  'ops',
  'historyPageLimit',
  'historyDedupeKey',
  'historyNotificationBudget',
  'historyCooldownApplied',
  'historyDurableCardAnchor',
]) {
  assert.equal(rebuildLivePreview.includes(forbiddenVisibleLeak), false, `live-preview rebuild must not expose ${forbiddenVisibleLeak}`)
  assert.equal(sanitizeLivePreview.includes(forbiddenVisibleLeak), false, `live-preview sanitizer must not expose ${forbiddenVisibleLeak}`)
}

console.log('[godot_player_history_live_preview_static_contract] all checks passed')
