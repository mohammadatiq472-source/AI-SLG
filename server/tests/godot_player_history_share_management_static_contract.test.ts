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
const managementRuntime = read('server/tests/player_history_share_management_runtime_contract.test.ts')
const persistenceRuntime = read('server/tests/player_history_share_management_persistence_runtime_contract.test.ts')

assert.ok(
  packageJson.includes('"test:godot:player-history-share-management-static-contract"'),
  'package.json must expose Godot player-history share management static contract',
)

assert.ok(
  authority.includes('Stage 565 Godot player-history share management static status') &&
    authority.includes('`npm.cmd run test:godot:player-history-share-management-static-contract`') &&
    handoff.includes('Stage 565 - Godot player-history share management static bridge'),
  'authority and CURRENT handoff must record Stage 565 share management bridge gate',
)

assert.ok(
  managementRuntime.includes('shareManagementLabel') &&
    persistenceRuntime.includes('PLAYER_HISTORY_SHARE_STATE_PATH') &&
    persistenceRuntime.includes("assert.equal(restoredRevokedSummary.status, 'revoked')") &&
    persistenceRuntime.includes("assert.equal(restoredRevokedSummary.shareStateLabel, '已撤回只读纪事')"),
  'Godot management bridge must build on Stage 563 runtime management and Stage 564 persistence proof',
)

const listHelper = functionSource(
  backendApiClient,
  'func get_player_history_share_tokens(faction_id: String = "player") -> Dictionary:',
)
for (const helperFact of [
  'var session_token := SessionStore.token.strip_edges()',
  'extra_headers["Authorization"] = "Bearer %s" % session_token',
  '"/api/player-history/share-token?factionId=%s"',
  'normalized_faction_id.uri_encode()',
]) {
  assert.ok(listHelper.includes(helperFact), `share list helper should include ${helperFact}`)
}

const revokeHelper = functionSource(
  backendApiClient,
  'func delete_player_history_share_token(share_id: String, faction_id: String = "player") -> Dictionary:',
)
for (const helperFact of [
  '"error": "missing_player_history_share_id"',
  'var session_token := SessionStore.token.strip_edges()',
  'extra_headers["Authorization"] = "Bearer %s" % session_token',
  '"DELETE"',
  '"/api/player-history/share-token?shareId=%s&factionId=%s"',
  'normalized_share_id.uri_encode()',
  'normalized_faction_id.uri_encode()',
]) {
  assert.ok(revokeHelper.includes(helperFact), `share revoke helper should include ${helperFact}`)
}

const visibleLabelSlice = playerHistoryPanel.slice(
  playerHistoryPanel.indexOf('const PLAYER_HISTORY_VISIBLE_LABELS := {'),
  playerHistoryPanel.indexOf('var _backend_api_client'),
)
for (const requiredLabel of [
  '"shareManagement": "分享管理"',
  '"shareManagementEmpty": "暂无已开放分享"',
  '"shareManagementReady": "已更新分享列表"',
  '"shareRevoke": "撤回"',
  '"shareRevoked": "已撤回只读纪事"',
]) {
  assert.ok(visibleLabelSlice.includes(requiredLabel), `visible labels should include ${requiredLabel}`)
}

for (const stateFact of [
  'var _share_management_requested_count := 0',
  'var _share_management_share_count := 0',
  'var _share_management_feedback_text := ""',
  'var _share_management_revoked_count := 0',
  'var _share_management_last_status_label := ""',
  'var _share_management_last_retention_label := ""',
  'var _share_management_summaries: Array[Dictionary] = []',
]) {
  assert.ok(playerHistoryPanel.includes(stateFact), `panel should track ${stateFact}`)
}

const rebuildShareManagement = functionSource(playerHistoryPanel, 'func _rebuild_share_management() -> void:')
for (const rendererFact of [
  'PLAYER_HISTORY_VISIBLE_LABELS.get("shareManagement"',
  'ShareManagementEmptyLabel',
  'ShareManagementCard%02d',
  'ShareManagementRevokeButton%02d',
  '"player_history_share_management_revoke"',
  'revoke_button.pressed.connect(_on_share_management_revoke_pressed.bind(feedback, share_id))',
]) {
  assert.ok(rebuildShareManagement.includes(rendererFact), `share management renderer should include ${rendererFact}`)
}

const refreshManagement = functionSource(playerHistoryPanel, 'func refresh_share_management() -> void:')
for (const refreshFact of [
  '_share_management_requested_count += 1',
  'get_player_history_share_tokens("player")',
  '_share_management_summaries.clear()',
  '_sanitize_share_management_summary',
  '_share_management_share_count = _share_management_summaries.size()',
  'PLAYER_HISTORY_VISIBLE_LABELS.get("shareManagementReady"',
  '_refresh_view()',
]) {
  assert.ok(refreshManagement.includes(refreshFact), `share management refresh should include ${refreshFact}`)
}

const sanitizer = functionSource(playerHistoryPanel, 'func _sanitize_share_management_summary(share: Dictionary) -> Dictionary:')
for (const sanitizerFact of [
  '"shareId": share_id',
  '"status": status',
  '"eventTitle": str(share.get("eventTitle"',
  '"shareStateLabel": str(share.get("shareStateLabel"',
  '"shareRetentionLabel": str(share.get("shareRetentionLabel"',
]) {
  assert.ok(sanitizer.includes(sanitizerFact), `share sanitizer should include ${sanitizerFact}`)
}

const revokeFlow = functionSource(playerHistoryPanel, 'func _on_share_management_revoke_pressed(feedback_label: Label, share_id: String) -> void:')
for (const revokeFact of [
  'delete_player_history_share_token(resolved_share_id, "player")',
  '_share_management_revoked_count += 1',
  'PLAYER_HISTORY_VISIBLE_LABELS.get("shareRevoked"',
  '_share_management_last_retention_label = str(data.get("shareRetentionLabel"',
  'await refresh_share_management()',
]) {
  assert.ok(revokeFlow.includes(revokeFact), `share revoke flow should include ${revokeFact}`)
}

const summary = functionSource(playerHistoryPanel, 'func get_player_history_visual_smoke_summary() -> Dictionary:')
for (const summaryFact of [
  '"shareManagementRequestedCount": _share_management_requested_count',
  '"shareManagementShareCount": _share_management_share_count',
  '"shareManagementFeedbackText": _share_management_feedback_text',
  '"shareManagementRevokedCount": _share_management_revoked_count',
  '"shareManagementLastStatusLabel": _share_management_last_status_label',
  '"shareManagementLastRetentionLabel": _share_management_last_retention_label',
]) {
  assert.ok(summary.includes(summaryFact), `summary should expose safe share management field ${summaryFact}`)
}

for (const forbiddenVisibleLeak of [
  'shareToken',
  '/api/player-history',
  'Authorization',
  'Bearer',
  'SessionStore',
  'missing_player_history_share_id',
  'explicit_spectator',
]) {
  assert.equal(visibleLabelSlice.includes(forbiddenVisibleLeak), false, `visible labels must not expose ${forbiddenVisibleLeak}`)
  assert.equal(rebuildShareManagement.includes(forbiddenVisibleLeak), false, `share management renderer must not expose ${forbiddenVisibleLeak}`)
}

for (const forbiddenSummaryLeak of [
  'shareToken',
  'SessionStore',
  'Authorization',
  'Bearer',
]) {
  assert.equal(summary.includes(forbiddenSummaryLeak), false, `summary must not expose ${forbiddenSummaryLeak}`)
}

console.log('[godot_player_history_share_management_static_contract] all checks passed')
