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

const historyContract = read('shared/contracts/game/history.ts')
const historyDomain = read('shared/domain/playerHistory.ts')
const playerHistoryRoute = read('server/src/routes/playerHistory.ts')
const worldEventActivityPanel = read('godot-client/scripts/ui/world_event_activity_panel.gd')
const runtimeShareTest = read('server/tests/player_history_civil_memory_detail_share_token_runtime_contract.test.ts')
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')

assert.ok(
  packageJson.includes('"test:godot:player-history-timeline-recovery-civil-memory-retention-policy-ui-contract"'),
  'package.json must expose Civil Memory retention policy UI contract',
)

assert.ok(
  authority.includes('Stage 544 Godot Civil Memory retention policy UI status') &&
    authority.includes('`npm.cmd run test:godot:player-history-timeline-recovery-civil-memory-retention-policy-ui-contract`'),
  'authority must record Stage 544 retention policy UI gate',
)

assert.ok(
  historyContract.includes('shareRetentionLabel?: string') &&
    historyDomain.includes('shareRetentionLabel: options.sharedScope === \'public_context\' ? options.shareRetentionLabel : undefined'),
  'shared detail contract/domain should carry player-safe retention label',
)

for (const routeFact of [
  'shareRetentionLabel: buildCivilMemoryShareRetentionLabel(expiresAtMs)',
  'shareRetentionLabel: buildCivilMemoryShareRetentionLabel(expiresAtMs)',
  'function buildCivilMemoryShareRetentionLabel(expiresAtMs: number): string',
  'return `分享约 ${remainingMinutes} 分钟内可查看`',
]) {
  assert.ok(playerHistoryRoute.includes(routeFact), `player-history route should include retention fact ${routeFact}`)
}

assert.ok(
  runtimeShareTest.includes("assert.match(String(issuePayload.shareRetentionLabel ?? ''), /^分享约 \\d+ 分钟内可查看$/)") &&
    runtimeShareTest.includes("assert.match(String(detail.shareRetentionLabel ?? ''), /^分享约 \\d+ 分钟内可查看$/)"),
  'runtime share-token contract should prove issue and shared detail retention labels',
)

const sanitizeDetail = functionSource(worldEventActivityPanel, 'func _sanitize_civil_memory_detail_read_model(read_model: Dictionary) -> Dictionary:')
const retentionCard = functionSource(worldEventActivityPanel, 'func _append_civil_memory_retention_card(cards: Array) -> void:')
const retentionLabel = functionSource(worldEventActivityPanel, 'func _civil_memory_share_retention_label(fallback: String = "") -> String:')
const insertDetail = functionSource(worldEventActivityPanel, 'func _insert_civil_memory_detail_block() -> bool:')
const buildPage = functionSource(worldEventActivityPanel, 'func _build_civil_memory_detail_page_section() -> Dictionary:')
const issueShare = functionSource(worldEventActivityPanel, 'func _issue_civil_memory_share_token() -> void:')

for (const sanitizeFact of [
  'var share_retention_label := str(read_model.get("shareRetentionLabel", "")).strip_edges()',
  'sanitized["shareRetentionLabel"] = share_retention_label',
]) {
  assert.ok(sanitizeDetail.includes(sanitizeFact), `detail sanitizer should keep retention fact ${sanitizeFact}`)
}

for (const visibleFact of [
  '"title": "有效期"',
  '"value": retention_label',
  '"meta": "短期查看"',
  '"description": "过期后需重新分享。"',
]) {
  assert.ok(retentionCard.includes(visibleFact), `retention card should include visible fact ${visibleFact}`)
}

assert.ok(
  retentionLabel.includes('shareRetentionLabel') &&
    retentionLabel.includes('return fallback.strip_edges()'),
  'retention helper should use safe retention label with fallback',
)

assert.ok(
  insertDetail.includes('_append_civil_memory_retention_card(detail_cards)') &&
    buildPage.includes('_append_civil_memory_retention_card(detail_cards)'),
  'aggregate and dedicated detail blocks should render retention card',
)

assert.ok(
  issueShare.includes('var retention_label := str(data.get("shareRetentionLabel", "")).strip_edges()') &&
    issueShare.includes('_civil_memory_detail_read_model_cache["shareRetentionLabel"] = retention_label'),
  'share issue flow should feed retention label into visible cache',
)

for (const forbiddenVisibleLeak of [
  'expiresAtMs',
  'Date.now',
  'shareToken',
  '_focused_civil_memory_share_token',
  '/api/player-history/civil-memory-detail',
  'route',
  'token',
]) {
  assert.equal(retentionCard.includes(forbiddenVisibleLeak), false, `retention card must not expose ${forbiddenVisibleLeak}`)
  assert.equal(insertDetail.includes(forbiddenVisibleLeak), false, `aggregate retention surface must not expose ${forbiddenVisibleLeak}`)
  assert.equal(buildPage.includes(forbiddenVisibleLeak), false, `dedicated retention surface must not expose ${forbiddenVisibleLeak}`)
}

console.log('[godot_player_history_timeline_recovery_civil_memory_retention_policy_ui_contract] all checks passed')
