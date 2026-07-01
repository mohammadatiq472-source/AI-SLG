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
  packageJson.includes('"test:godot:player-history-timeline-recovery-civil-memory-visible-focus-contract"'),
  'package.json must expose the Civil Memory visible focus contract command',
)

assert.ok(
  authority.includes('Stage 535 Godot Civil Memory visible focus status') &&
    authority.includes('`npm.cmd run test:godot:player-history-timeline-recovery-civil-memory-visible-focus-contract`'),
  'authority must record the Civil Memory visible focus gate',
)

const focusApi = functionSource(
  worldEventActivityPanel,
  'func open_civil_memory_by_internal_id(civil_memory_id: String, focus_payload: Dictionary = {}) -> bool:',
)
const insertBlock = functionSource(worldEventActivityPanel, 'func _insert_civil_memory_focus_block() -> bool:')
const activitySummary = functionSource(worldEventActivityPanel, 'func get_world_event_activity_visual_smoke_summary(page_id: String = "") -> Dictionary:')

assert.ok(
  focusApi.includes('_civil_memory_focus_visible = _insert_civil_memory_focus_block()') &&
    focusApi.includes('call("set_active_page_id", "world_affairs")'),
  'focus API must insert a visible focus block before opening world affairs',
)

for (const visibleFact of [
  '"kind": "feature_card_grid"',
  '"node_name": "CivilMemoryFocusedHintBlock"',
  'focus_title = "传闻已定位"',
  'focus_summary = "已为你打开相关传闻。"',
  'focus_next = "可在这里查看相关局势与传闻线索。"',
  '"title": focus_title',
  '"value": focus_summary',
  '"description": focus_next',
  '"tone": "gold"',
]) {
  assert.ok(insertBlock.includes(visibleFact), `visible Civil Memory focus block should include ${visibleFact}`)
}

for (const summaryFact of [
  '"civilMemoryFocusVisible": _civil_memory_focus_visible',
  '"civilMemoryFocusRequested": _civil_memory_focus_requested',
  '"civilMemoryFocusIdResolved": _focused_civil_memory_internal_id != ""',
]) {
  assert.ok(activitySummary.includes(summaryFact), `summary should include ${summaryFact}`)
}

for (const forbiddenRawId of [
  '"civilMemoryFocusId"',
  '"focusedCivilMemoryId"',
  '_focused_civil_memory_internal_id,',
  '"civilMemoryId"',
]) {
  assert.equal(insertBlock.includes(forbiddenRawId), false, `visible block must not expose raw id ${forbiddenRawId}`)
  assert.equal(activitySummary.includes(forbiddenRawId), false, `summary must not expose raw id ${forbiddenRawId}`)
}

console.log('[godot_player_history_timeline_recovery_civil_memory_visible_focus_contract] all checks passed')
