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
const readSideContract = read('server/tests/player_history_explicit_spectator_share_grant_runtime_contract.test.ts')
const issuanceContract = read('server/tests/godot_player_history_share_token_issuance_static_contract.test.ts')

assert.ok(
  packageJson.includes('"test:godot:player-history-share-token-read-static-contract"'),
  'package.json must expose Godot player-history share-token read static contract',
)

assert.ok(
  authority.includes('Stage 561 Godot player-history share-token read bridge status') &&
    authority.includes('`npm.cmd run test:godot:player-history-share-token-read-static-contract`') &&
    handoff.includes('Stage 561 - Godot player-history share-token read bridge'),
  'authority and CURRENT handoff must record Stage 561 share-token read bridge gate',
)

assert.ok(
  readSideContract.includes('explicit_spectator') &&
    readSideContract.includes('shareToken') &&
    readSideContract.includes('explicit spectator card should be hidden without share token') &&
    readSideContract.includes('explicit spectator card should be hidden with wrong share token') &&
    readSideContract.includes('signed exact share token should expose explicit spectator card'),
  'Stage 558 explicit spectator read-side grant must be proven before the Godot read bridge',
)

assert.ok(
  issuanceContract.includes('post_player_history_share_token(event_id, "player", 300000)') &&
    issuanceContract.includes('"test:godot:player-history-share-token-issuance-static-contract"'),
  'Stage 560 Godot issuance bridge must exist before the read bridge',
)

const sharedReadHelper = functionSource(
  backendApiClient,
  'func get_shared_player_history_read_model(share_token: String, limit: int = 80) -> Dictionary:',
)
for (const helperFact of [
  '"error": "missing_player_history_share_token"',
  '"shareToken=%s" % normalized_share_token.uri_encode()',
  '"limit=%d" % normalized_limit',
  '"eventLimit=%d" % normalized_limit',
  '"civilMemoryLimit=%d" % normalized_limit',
  'return await request_json("GET", "/api/player-history?%s" % "&".join(query_parts))',
]) {
  assert.ok(sharedReadHelper.includes(helperFact), `shared read helper should include ${helperFact}`)
}

const visibleLabelSlice = playerHistoryPanel.slice(
  playerHistoryPanel.indexOf('const PLAYER_HISTORY_VISIBLE_LABELS := {'),
  playerHistoryPanel.indexOf('var _backend_api_client'),
)
for (const requiredLabel of [
  '"sharedReadReady": "已打开只读纪事"',
  '"sharedReadUnavailable": "这段纪事暂时无法查看"',
]) {
  assert.ok(visibleLabelSlice.includes(requiredLabel), `visible labels should include ${requiredLabel}`)
}

const openShared = functionSource(playerHistoryPanel, 'func open_shared_player_history(share_token: String, limit: int = 80) -> void:')
for (const openFact of [
  '_shared_history_read_requested_count += 1',
  'var resolved_share_token := share_token.strip_edges()',
  'get_shared_player_history_read_model(resolved_share_token, limit)',
  '_shared_history_read_success_count += 1',
  '_shared_history_read_active = true',
  'PLAYER_HISTORY_VISIBLE_LABELS.get("sharedReadReady"',
  'PLAYER_HISTORY_VISIBLE_LABELS.get("sharedReadUnavailable"',
  'set_player_history_read_model(data)',
]) {
  assert.ok(openShared.includes(openFact), `shared open flow should include ${openFact}`)
}

const summary = functionSource(playerHistoryPanel, 'func get_player_history_visual_smoke_summary() -> Dictionary:')
for (const summaryFact of [
  '"sharedHistoryReadRequestedCount": _shared_history_read_requested_count',
  '"sharedHistoryReadSuccessCount": _shared_history_read_success_count',
  '"sharedHistoryReadFeedbackText": _shared_history_read_feedback_text',
  '"sharedHistoryReadActive": _shared_history_read_active',
]) {
  assert.ok(summary.includes(summaryFact), `summary should include safe shared-read field ${summaryFact}`)
}

for (const forbiddenVisibleLeak of [
  'shareToken',
  '/api/player-history',
  'Authorization',
  'Bearer',
  'SessionStore',
  'missing_player_history_share_token',
  'explicit_spectator',
]) {
  assert.equal(visibleLabelSlice.includes(forbiddenVisibleLeak), false, `visible labels must not expose ${forbiddenVisibleLeak}`)
}

for (const forbiddenSummaryLeak of [
  'shareToken',
  'resolved_share_token',
  'missing_player_history_share_token',
]) {
  assert.equal(summary.includes(forbiddenSummaryLeak), false, `summary must not expose ${forbiddenSummaryLeak}`)
}

console.log('[godot_player_history_share_token_read_static_contract] all checks passed')
