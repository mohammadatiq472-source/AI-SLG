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
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')

assert.ok(
  packageJson.includes('"test:godot:player-history-timeline-recovery-civil-memory-dedicated-detail-page-contract"'),
  'package.json must expose Civil Memory dedicated detail page contract',
)

assert.ok(
  authority.includes('Stage 539 Godot Civil Memory dedicated detail page status') &&
    authority.includes('`npm.cmd run test:godot:player-history-timeline-recovery-civil-memory-dedicated-detail-page-contract`'),
  'authority must record Stage 539 dedicated detail page gate',
)

const summary = functionSource(worldEventActivityPanel, 'func get_world_event_activity_visual_smoke_summary(page_id: String = "") -> Dictionary:')
const focusApi = functionSource(
  worldEventActivityPanel,
  'func open_civil_memory_by_internal_id(civil_memory_id: String, focus_payload: Dictionary = {}) -> bool:',
)
const applyDetail = functionSource(worldEventActivityPanel, 'func _apply_civil_memory_detail_read_model(read_model: Dictionary) -> void:')
const insertPage = functionSource(worldEventActivityPanel, 'func _insert_civil_memory_detail_page() -> bool:')
const buildPage = functionSource(worldEventActivityPanel, 'func _build_civil_memory_detail_page_section() -> Dictionary:')
const unavailableCopy = functionSource(worldEventActivityPanel, 'func _apply_civil_memory_detail_unavailable_copy(copy: String) -> void:')

for (const summaryFact of [
  '"civilMemoryDetailPageVisible": _civil_memory_detail_page_visible',
  '"civil_memory_detail":',
  '"CivilMemoryDedicatedDetailPageBlock"',
  '"civilMemoryDetailPageBlockVisible"',
]) {
  assert.ok(summary.includes(summaryFact), `summary should include dedicated detail page fact ${summaryFact}`)
}

assert.ok(
  focusApi.includes('_civil_memory_detail_page_visible = false') &&
    unavailableCopy.includes('_civil_memory_detail_page_visible = false'),
  'focus and unavailable paths should reset dedicated detail page visibility',
)

assert.ok(
  applyDetail.includes('_civil_memory_detail_page_visible = _insert_civil_memory_detail_page()') &&
    applyDetail.includes('call("set_active_page_id", "civil_memory_detail")'),
  'successful detail read model should create and open the dedicated detail page',
)

for (const pageFact of [
  'entry_configs["civil_memory_detail"]',
  '"page_id": "civil_memory_detail"',
  '"panel_title": "传闻详情"',
  '"entry_panel_ids": ["event", "world_event", "world_affairs"]',
  'sections["civil_memory_detail"] = _build_civil_memory_detail_page_section()',
]) {
  assert.ok(insertPage.includes(pageFact), `dedicated page insertion should include ${pageFact}`)
}

for (const visibleFact of [
  '"node_name": "CivilMemoryDedicatedDetailPageBlock"',
  '"title": "传闻详情"',
  '"actions": [{',
  '"id": "template_open:world_affairs"',
  '"label": "返回天下大势"',
  '"title": title',
  '"value": summary',
  '"description": consequence',
]) {
  assert.ok(buildPage.includes(visibleFact), `dedicated detail page should include ${visibleFact}`)
}

for (const forbiddenRawField of [
  'civilMemoryId',
  'sourceRefs',
  'metadata',
  'integrity',
  '/api/player-history/civil-memory-detail',
]) {
  assert.equal(buildPage.includes(forbiddenRawField), false, `dedicated detail page must not expose ${forbiddenRawField}`)
  assert.equal(summary.includes(forbiddenRawField), false, `dedicated detail summary must not expose ${forbiddenRawField}`)
}

assert.equal(
  buildPage.includes('_focused_civil_memory_internal_id'),
  false,
  'dedicated detail page must not render the raw focused Civil Memory id',
)

console.log('[godot_player_history_timeline_recovery_civil_memory_dedicated_detail_page_contract] all checks passed')
