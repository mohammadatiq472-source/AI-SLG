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

const worldEventActivityPanel = read('godot-client/scripts/ui/world_event_activity_panel.gd')
const httpContract = read('server/tests/player_history_civil_memory_detail_http_contract.test.ts')
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')

assert.ok(
  packageJson.includes('"test:godot:player-history-timeline-recovery-civil-memory-detail-unavailable-contract"'),
  'package.json must expose Civil Memory detail unavailable contract',
)

assert.ok(
  authority.includes('Stage 538 Godot Civil Memory detail unavailable status') &&
    authority.includes('`npm.cmd run test:godot:player-history-timeline-recovery-civil-memory-detail-unavailable-contract`'),
  'authority must record Stage 538 unavailable gate',
)

assert.ok(
  httpContract.includes("deniedCopy, '暂无可查看的传闻详情'") &&
    httpContract.includes("deniedCopy, '这段传闻暂时不可查看'"),
  'HTTP detail contract must prove player-safe denied copy sources',
)

const focusApi = functionSource(
  worldEventActivityPanel,
  'func open_civil_memory_by_internal_id(civil_memory_id: String, focus_payload: Dictionary = {}) -> bool:',
)
const fetchDetail = functionSource(worldEventActivityPanel, 'func _fetch_civil_memory_detail_if_needed() -> void:')
const unavailableResponse = functionSource(worldEventActivityPanel, 'func _apply_civil_memory_detail_unavailable_response(response: Dictionary) -> void:')
const unavailableCopy = functionSource(worldEventActivityPanel, 'func _apply_civil_memory_detail_unavailable_copy(copy: String) -> void:')
const unavailableBlock = functionSource(worldEventActivityPanel, 'func _insert_civil_memory_detail_unavailable_block() -> bool:')
const activitySummary = functionSource(worldEventActivityPanel, 'func get_world_event_activity_visual_smoke_summary(page_id: String = "") -> Dictionary:')

for (const resetFact of [
  '_civil_memory_detail_unavailable_visible = false',
  '_civil_memory_detail_unavailable_copy = ""',
  '_civil_memory_detail_read_model_cache = {}',
]) {
  assert.ok(focusApi.includes(resetFact), `focus API should reset unavailable state ${resetFact}`)
}

for (const fetchFact of [
  '_apply_civil_memory_detail_unavailable_response(response)',
  '_apply_civil_memory_detail_unavailable_copy("这段传闻暂时不可查看")',
]) {
  assert.ok(fetchDetail.includes(fetchFact), `detail fetch should handle unavailable fact ${fetchFact}`)
}

for (const responseFact of [
  'data_variant is Dictionary',
  'deniedCopy',
  'copy = "这段传闻暂时不可查看"',
  '_apply_civil_memory_detail_unavailable_copy(copy)',
]) {
  assert.ok(unavailableResponse.includes(responseFact), `unavailable response should include ${responseFact}`)
}

for (const stateFact of [
  '_civil_memory_detail_loaded = false',
  '_civil_memory_detail_visible = false',
  '_civil_memory_detail_read_model_cache = {}',
  '_civil_memory_detail_unavailable_copy = resolved_copy',
  '_civil_memory_detail_unavailable_visible = _insert_civil_memory_detail_unavailable_block()',
]) {
  assert.ok(unavailableCopy.includes(stateFact), `unavailable state should include ${stateFact}`)
}

for (const visibleFact of [
  '"node_name": "CivilMemoryDetailUnavailableBlock"',
  '"title": "传闻暂不可查看"',
  '"value": resolved_copy',
  '"description": "你仍可先查看相关局势，稍后再回到这段传闻。"',
]) {
  assert.ok(unavailableBlock.includes(visibleFact), `unavailable block should include ${visibleFact}`)
}

for (const summaryFact of [
  '"civilMemoryDetailUnavailableVisible": _civil_memory_detail_unavailable_visible',
  '"civilMemoryDetailUnavailableCopy": _civil_memory_detail_unavailable_copy',
]) {
  assert.ok(activitySummary.includes(summaryFact), `summary should expose safe unavailable state ${summaryFact}`)
}

for (const forbiddenRawField of [
  'civilMemoryId',
  'sourceRefs',
  'metadata',
  'integrity',
  '/api/player-history/civil-memory-detail',
  '_focused_civil_memory_internal_id',
]) {
  assert.equal(unavailableBlock.includes(forbiddenRawField), false, `unavailable visible block must not expose ${forbiddenRawField}`)
  assert.equal(unavailableCopy.includes(forbiddenRawField), false, `unavailable copy handler must not expose ${forbiddenRawField}`)
}

console.log('[godot_player_history_timeline_recovery_civil_memory_detail_unavailable_contract] all checks passed')
