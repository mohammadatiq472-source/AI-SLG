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

function tsFunctionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const nextFunction = source.indexOf('\nfunction ', start + signature.length)
  const end = nextFunction > start ? nextFunction : source.length
  return source.slice(start, end)
}

const backendClient = read('godot-client/scripts/infra/http/backend_api_client.gd')
const worldEventActivityPanel = read('godot-client/scripts/ui/world_event_activity_panel.gd')
const playerHistoryRoute = read('server/src/routes/playerHistory.ts')
const appSource = read('server/src/app.ts')
const historyContract = read('shared/contracts/game/history.ts')
const historyDomain = read('shared/domain/playerHistory.ts')
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')

assert.ok(
  packageJson.includes('"test:world:player-history-civil-memory-detail-http-contract"') &&
    packageJson.includes('"test:godot:player-history-timeline-recovery-civil-memory-detail-fetch-contract"'),
  'package.json must expose Civil Memory detail HTTP and Godot fetch contracts',
)

assert.ok(
  authority.includes('Stage 537 Godot Civil Memory backend detail fetch status') &&
    authority.includes('`npm.cmd run test:world:player-history-civil-memory-detail-http-contract`') &&
    authority.includes('`npm.cmd run test:godot:player-history-timeline-recovery-civil-memory-detail-fetch-contract`'),
  'authority must record Stage 537 detail fetch gates',
)

for (const backendFact of [
  'func get_player_history_civil_memory_detail(civil_memory_id: String, share_token: String = "") -> Dictionary:',
  '"/api/player-history/civil-memory-detail?%s" % "&".join(query_parts)',
]) {
  assert.ok(backendClient.includes(backendFact), `BackendApiClient should include ${backendFact}`)
}

for (const routeFact of [
  'export function handlePlayerHistoryCivilMemoryDetailRoute',
  "requestUrl.searchParams.get('civilMemoryId')",
  'getCivilMemoryDetailById(civilMemoryId)',
  'buildCivilMemoryDetailReadModel(entry, { sharedScope })',
  'deniedCopy',
]) {
  assert.ok(playerHistoryRoute.includes(routeFact), `player-history route should include ${routeFact}`)
}

assert.ok(
  appSource.includes("requestUrl.pathname === '/api/player-history/civil-memory-detail'") &&
    appSource.includes('handlePlayerHistoryCivilMemoryDetailRoute(req, res)'),
  'app should route Civil Memory detail HTTP endpoint',
)

for (const modelFact of [
  "export type CivilMemoryDetailReadModel",
  "contractId: 'civil_memory_detail_read_model_v1'",
  'export function buildCivilMemoryDetailReadModel(',
  'metadata',
  'prevHash',
  'chainIndex',
  'hash',
]) {
  if (modelFact === 'metadata' || modelFact === 'prevHash' || modelFact === 'chainIndex' || modelFact === 'hash') {
    const detailSlice = tsFunctionSource(
      historyDomain,
      'export function buildCivilMemoryDetailReadModel(',
    )
    assert.equal(detailSlice.includes(modelFact), false, `detail read model builder must not expose ${modelFact}`)
  } else {
    assert.ok(
      historyContract.includes(modelFact) || historyDomain.includes(modelFact),
      `shared detail model should include ${modelFact}`,
    )
  }
}

const focusApi = functionSource(
  worldEventActivityPanel,
  'func open_civil_memory_by_internal_id(civil_memory_id: String, focus_payload: Dictionary = {}) -> bool:',
)
const fetchDetail = functionSource(worldEventActivityPanel, 'func _fetch_civil_memory_detail_if_needed() -> void:')
const applyDetail = functionSource(worldEventActivityPanel, 'func _apply_civil_memory_detail_read_model(read_model: Dictionary) -> void:')
const sanitizeDetail = functionSource(worldEventActivityPanel, 'func _sanitize_civil_memory_detail_read_model(read_model: Dictionary) -> Dictionary:')
const insertDetail = functionSource(worldEventActivityPanel, 'func _insert_civil_memory_detail_block() -> bool:')
const activitySummary = functionSource(worldEventActivityPanel, 'func get_world_event_activity_visual_smoke_summary(page_id: String = "") -> Dictionary:')

assert.ok(
  focusApi.includes('call_deferred("_fetch_civil_memory_detail_if_needed")'),
  'focus API should schedule backend Civil Memory detail fetch',
)

for (const fetchFact of [
  'get_player_history_civil_memory_detail',
  '"/api/player-history/civil-memory-detail?%s" % "&".join(query_parts)',
  'data.get("civilMemoryDetail", {})',
  '_apply_civil_memory_detail_read_model(detail_variant as Dictionary)',
]) {
  assert.ok(fetchDetail.includes(fetchFact), `detail fetch should include ${fetchFact}`)
}

assert.ok(
  applyDetail.includes('contract_id != "civil_memory_detail_read_model_v1"') &&
    applyDetail.includes('_civil_memory_detail_loaded = not _civil_memory_detail_read_model_cache.is_empty()') &&
    applyDetail.includes('_civil_memory_detail_visible = _insert_civil_memory_detail_block()'),
  'panel should validate and render detail read model',
)

for (const safeField of [
  '"title": str(read_model.get("title", "")).strip_edges()',
  '"summary": str(read_model.get("summary", "")).strip_edges()',
  '"affectedPartyLabel": str(read_model.get("affectedPartyLabel", "")).strip_edges()',
  '"resultLabel": str(read_model.get("resultLabel", "")).strip_edges()',
  '"consequenceLabel": str(read_model.get("consequenceLabel", "")).strip_edges()',
  '"followUpLabel": str(read_model.get("followUpLabel", "")).strip_edges()',
  '"timestampLabel": str(read_model.get("timestampLabel", "")).strip_edges()',
]) {
  assert.ok(sanitizeDetail.includes(safeField), `detail sanitizer should keep ${safeField}`)
}

for (const visibleFact of [
  '"node_name": "CivilMemoryDetailBlock"',
  '"title": "传闻详情"',
  '"kind": "feature_card_grid"',
  '"layout": "showcase"',
  '"title": title',
  '"value": summary',
  '"description": consequence',
]) {
  assert.ok(insertDetail.includes(visibleFact), `detail block should include ${visibleFact}`)
}

for (const summaryFact of [
  '"civilMemoryDetailLoaded": _civil_memory_detail_loaded',
  '"civilMemoryDetailVisible": _civil_memory_detail_visible',
]) {
  assert.ok(activitySummary.includes(summaryFact), `summary should expose safe detail state ${summaryFact}`)
}

for (const forbiddenRawField of [
  'sourceRefs',
  'civilMemoryId',
  'metadata',
  'integrity',
  'sessionId',
  'proposalId',
  'resolutionId',
]) {
  assert.equal(sanitizeDetail.includes(forbiddenRawField), false, `detail sanitizer must not expose ${forbiddenRawField}`)
  assert.equal(insertDetail.includes(forbiddenRawField), false, `detail visible block must not expose ${forbiddenRawField}`)
}

console.log('[godot_player_history_timeline_recovery_civil_memory_detail_fetch_contract] all checks passed')
