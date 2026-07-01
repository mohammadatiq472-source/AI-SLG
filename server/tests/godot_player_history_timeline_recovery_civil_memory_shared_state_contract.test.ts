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
const historyContract = read('shared/contracts/game/history.ts')
const historyDomain = read('shared/domain/playerHistory.ts')
const playerHistoryRoute = read('server/src/routes/playerHistory.ts')
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')

assert.ok(
  packageJson.includes('"test:godot:player-history-timeline-recovery-civil-memory-shared-state-contract"'),
  'package.json must expose Civil Memory shared-state Godot contract',
)

assert.ok(
  authority.includes('Stage 542 Godot Civil Memory shared-state UI status') &&
    authority.includes('`npm.cmd run test:godot:player-history-timeline-recovery-civil-memory-shared-state-contract`'),
  'authority must record Stage 542 shared-state UI gate',
)

for (const backendFact of [
  'func get_player_history_civil_memory_detail(civil_memory_id: String, share_token: String = "") -> Dictionary:',
  'var normalized_share_token := share_token.strip_edges()',
  'query_parts.append("shareToken=%s" % normalized_share_token.uri_encode())',
  '"/api/player-history/civil-memory-detail?%s" % "&".join(query_parts)',
]) {
  assert.ok(backendClient.includes(backendFact), `BackendApiClient should support shared detail request fact ${backendFact}`)
}

assert.ok(
  historyContract.includes("sharedScope?: 'public_context'") &&
    historyContract.includes('shareStateLabel?: string') &&
    historyDomain.includes("shareStateLabel: options.sharedScope === 'public_context' ? '已开放只读传闻' : undefined") &&
    playerHistoryRoute.includes('sharedScope: \'public_context\''),
  'shared contracts/domain/route should carry player-safe shared-state labels',
)

const focusApi = functionSource(
  worldEventActivityPanel,
  'func open_civil_memory_by_internal_id(civil_memory_id: String, focus_payload: Dictionary = {}) -> bool:',
)
const shareSanitizer = functionSource(worldEventActivityPanel, 'func _sanitize_civil_memory_share_token(payload: Dictionary) -> String:')
const fetchDetail = functionSource(worldEventActivityPanel, 'func _fetch_civil_memory_detail_if_needed() -> void:')
const sanitizeDetail = functionSource(worldEventActivityPanel, 'func _sanitize_civil_memory_detail_read_model(read_model: Dictionary) -> Dictionary:')
const sharedVisible = functionSource(worldEventActivityPanel, 'func _civil_memory_detail_shared_visible() -> bool:')
const insertDetail = functionSource(worldEventActivityPanel, 'func _insert_civil_memory_detail_block() -> bool:')
const buildPage = functionSource(worldEventActivityPanel, 'func _build_civil_memory_detail_page_section() -> Dictionary:')
const activitySummary = functionSource(worldEventActivityPanel, 'func get_world_event_activity_visual_smoke_summary(page_id: String = "") -> Dictionary:')

assert.ok(
  worldEventActivityPanel.includes('var _focused_civil_memory_share_token := ""') &&
    focusApi.includes('_focused_civil_memory_share_token = _sanitize_civil_memory_share_token(focus_payload)') &&
    shareSanitizer.includes('return str(payload.get("shareToken", "")).strip_edges()'),
  'panel should store share token internally from focus payload',
)

for (const fetchFact of [
  'var share_token := _focused_civil_memory_share_token.strip_edges()',
  'response = await api_client.call("get_player_history_civil_memory_detail", resolved_id, share_token)',
  'query_parts.append("shareToken=%s" % share_token.uri_encode())',
]) {
  assert.ok(fetchDetail.includes(fetchFact), `detail fetch should pass internal share token fact ${fetchFact}`)
}

for (const sanitizeFact of [
  'var shared_scope := str(read_model.get("sharedScope", "")).strip_edges()',
  'var share_state_label := str(read_model.get("shareStateLabel", "")).strip_edges()',
  'sanitized["sharedScope"] = "public_context"',
  'sanitized["shareStateLabel"] = share_state_label',
]) {
  assert.ok(sanitizeDetail.includes(sanitizeFact), `detail sanitizer should keep safe shared-state fact ${sanitizeFact}`)
}

assert.ok(
  sharedVisible.includes('sharedScope') &&
    sharedVisible.includes('shareStateLabel') &&
    activitySummary.includes('"civilMemoryDetailSharedVisible": _civil_memory_detail_shared_visible()'),
  'summary should expose only safe shared-state boolean',
)

for (const visibleFact of [
  'if _civil_memory_detail_shared_visible():',
  '"title": "共享"',
  '"value": str(_civil_memory_detail_read_model_cache.get("shareStateLabel", "已开放只读传闻")).strip_edges()',
  '"meta": _civil_memory_share_retention_label("只读查看")',
  '"description": "可安全查看这段传闻。"',
]) {
  assert.ok(insertDetail.includes(visibleFact), `aggregate detail block should show safe shared-state fact ${visibleFact}`)
  assert.ok(buildPage.includes(visibleFact), `dedicated detail page should show safe shared-state fact ${visibleFact}`)
}

for (const forbiddenVisibleLeak of [
  'shareToken',
  '_focused_civil_memory_share_token',
  'civilMemoryId',
  'sourceRefs',
  'metadata',
  'integrity',
  '/api/player-history/civil-memory-detail',
]) {
  assert.equal(insertDetail.includes(forbiddenVisibleLeak), false, `visible aggregate block must not expose ${forbiddenVisibleLeak}`)
  assert.equal(buildPage.includes(forbiddenVisibleLeak), false, `visible dedicated page must not expose ${forbiddenVisibleLeak}`)
  assert.equal(activitySummary.includes(forbiddenVisibleLeak), false, `summary must not expose ${forbiddenVisibleLeak}`)
}

console.log('[godot_player_history_timeline_recovery_civil_memory_shared_state_contract] all checks passed')
