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

const backendClient = read('godot-client/scripts/infra/http/backend_api_client.gd')
const worldEventActivityPanel = read('godot-client/scripts/ui/world_event_activity_panel.gd')
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')

assert.ok(
  packageJson.includes('"test:godot:player-history-timeline-recovery-civil-memory-durable-share-ux-contract"'),
  'package.json must expose Civil Memory durable share UX contract',
)

assert.ok(
  authority.includes('Stage 543 Godot Civil Memory durable share UX status') &&
    authority.includes('`npm.cmd run test:godot:player-history-timeline-recovery-civil-memory-durable-share-ux-contract`'),
  'authority must record Stage 543 durable share UX gate',
)

const shareTokenClient = functionSource(
  backendClient,
  'func post_player_history_civil_memory_detail_share_token(civil_memory_id: String, faction_id: String = "player", ttl_ms: int = 300000) -> Dictionary:',
)
for (const clientFact of [
  'var session_token := SessionStore.token.strip_edges()',
  'extra_headers["Authorization"] = "Bearer %s" % session_token',
  '"/api/player-history/civil-memory-detail/share-token?civilMemoryId=%s&factionId=%s"',
  '"ttlMs": ttl_ms',
]) {
  assert.ok(shareTokenClient.includes(clientFact), `BackendApiClient should issue share token fact ${clientFact}`)
}

const summary = functionSource(worldEventActivityPanel, 'func get_world_event_activity_visual_smoke_summary(page_id: String = "") -> Dictionary:')
const focusApi = functionSource(
  worldEventActivityPanel,
  'func open_civil_memory_by_internal_id(civil_memory_id: String, focus_payload: Dictionary = {}) -> bool:',
)
const shareAction = functionSource(worldEventActivityPanel, 'func _civil_memory_share_action() -> Dictionary:')
const feedbackCard = functionSource(worldEventActivityPanel, 'func _append_civil_memory_share_feedback_card(cards: Array) -> void:')
const insertDetail = functionSource(worldEventActivityPanel, 'func _insert_civil_memory_detail_block() -> bool:')
const buildPage = functionSource(worldEventActivityPanel, 'func _build_civil_memory_detail_page_section() -> Dictionary:')
const actionHandler = functionSource(worldEventActivityPanel, 'func _on_section_page_action_requested(action_id: String) -> void:')
const issueShare = functionSource(worldEventActivityPanel, 'func _issue_civil_memory_share_token() -> void:')
const applyFeedback = functionSource(worldEventActivityPanel, 'func _apply_civil_memory_share_feedback(copy: String, issued: bool) -> void:')

for (const stateFact of [
  'var _civil_memory_share_action_visible := false',
  'var _civil_memory_share_feedback_visible := false',
  'var _civil_memory_share_feedback_copy := ""',
  'var _civil_memory_share_token_issued := false',
]) {
  assert.ok(worldEventActivityPanel.includes(stateFact), `panel should track share UX state ${stateFact}`)
}

for (const resetFact of [
  '_civil_memory_share_action_visible = false',
  '_civil_memory_share_feedback_visible = false',
  '_civil_memory_share_feedback_copy = ""',
  '_civil_memory_share_token_issued = false',
]) {
  assert.ok(focusApi.includes(resetFact), `focus should reset share UX state ${resetFact}`)
}

for (const summaryFact of [
  '"civilMemoryShareActionVisible": _civil_memory_share_action_visible',
  '"civilMemoryShareFeedbackVisible": _civil_memory_share_feedback_visible',
  '"civilMemoryShareFeedbackCopy": _civil_memory_share_feedback_copy',
  '"civilMemoryShareTokenIssued": _civil_memory_share_token_issued',
]) {
  assert.ok(summary.includes(summaryFact), `summary should include safe share UX fact ${summaryFact}`)
}

assert.ok(
  shareAction.includes('"id": "civil_memory_share:issue"') &&
    shareAction.includes('"label": "分享传闻"'),
  'share action should be a real player-facing action id and label',
)

for (const visibleFact of [
  '"title": "分享"',
  '"value": resolved_copy',
  '"meta": _civil_memory_share_retention_label("可发送给同盟成员")',
  '"description": "不会公开内部编号。"',
  '"tone": "green"',
]) {
  assert.ok(feedbackCard.includes(visibleFact), `share feedback card should include ${visibleFact}`)
}

for (const actionFact of [
  'var detail_actions: Array = [_civil_memory_share_action()]',
  '"actions": detail_actions',
  '_civil_memory_share_action_visible = true',
]) {
  assert.ok(insertDetail.includes(actionFact), `aggregate detail block should include share action fact ${actionFact}`)
}

for (const pageActionFact of [
  'var detail_actions: Array = [_civil_memory_share_action(), {',
  '"id": "template_open:world_affairs"',
  '"actions": detail_actions',
]) {
  assert.ok(buildPage.includes(pageActionFact), `dedicated detail page should include share action fact ${pageActionFact}`)
}

assert.ok(
  actionHandler.includes('if action_id == "civil_memory_share:issue":') &&
    actionHandler.includes('call_deferred("_issue_civil_memory_share_token")'),
  'section action handler should route share action',
)

for (const issueFact of [
  'post_player_history_civil_memory_detail_share_token',
  'response = await api_client.call("post_player_history_civil_memory_detail_share_token", resolved_id, "player", 300000)',
  'var issued_token := str(data.get("shareToken", "")).strip_edges()',
  '_focused_civil_memory_share_token = issued_token',
  '_apply_civil_memory_share_feedback("分享已准备", true)',
]) {
  assert.ok(issueShare.includes(issueFact), `share issue flow should include ${issueFact}`)
}

assert.ok(
  applyFeedback.includes('_civil_memory_share_feedback_visible = true') &&
    applyFeedback.includes('_civil_memory_detail_visible = _insert_civil_memory_detail_block()') &&
    applyFeedback.includes('_civil_memory_detail_page_visible = _insert_civil_memory_detail_page()'),
  'share feedback should rebuild visible detail blocks',
)

for (const forbiddenVisibleLeak of [
  'shareToken',
  'issued_token',
  '_focused_civil_memory_share_token',
  'civilMemoryId',
  '/api/player-history/civil-memory-detail',
  'Authorization',
  'Bearer',
]) {
  assert.equal(insertDetail.includes(forbiddenVisibleLeak), false, `aggregate visible block must not expose ${forbiddenVisibleLeak}`)
  assert.equal(buildPage.includes(forbiddenVisibleLeak), false, `dedicated visible block must not expose ${forbiddenVisibleLeak}`)
  assert.equal(feedbackCard.includes(forbiddenVisibleLeak), false, `feedback card must not expose ${forbiddenVisibleLeak}`)
}

console.log('[godot_player_history_timeline_recovery_civil_memory_durable_share_ux_contract] all checks passed')
