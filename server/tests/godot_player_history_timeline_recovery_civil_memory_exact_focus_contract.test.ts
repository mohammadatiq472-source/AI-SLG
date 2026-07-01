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

const mainSource = read('godot-client/scripts/app/main.gd')
const worldEventActivityPanel = read('godot-client/scripts/ui/world_event_activity_panel.gd')
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')

assert.ok(
  packageJson.includes('"test:godot:player-history-timeline-recovery-civil-memory-exact-focus-contract"'),
  'package.json must expose the Civil Memory exact focus contract command',
)

assert.ok(
  authority.includes('Stage 534 Godot timeline recovery Civil Memory exact focus status') &&
    authority.includes('`npm.cmd run test:godot:player-history-timeline-recovery-civil-memory-exact-focus-contract`'),
  'authority must record the Civil Memory exact focus gate',
)

const surfaceOpen = functionSource(mainSource, 'func _open_player_history_timeline_recovery_surface(target_surface: String) -> void:')
const focusApi = functionSource(
  worldEventActivityPanel,
  'func open_civil_memory_by_internal_id(civil_memory_id: String, focus_payload: Dictionary = {}) -> bool:',
)
const activitySummary = functionSource(worldEventActivityPanel, 'func get_world_event_activity_visual_smoke_summary(page_id: String = "") -> Dictionary:')

for (const requiredHostFact of [
  'if resolved_surface == "civil_memory":',
  '_open_overlay_panel("world_event")',
  'var exact_civil_memory_opened := false',
  '_player_history_timeline_recovery_identity_resolved',
  '_active_overlay_panel.has_method("open_civil_memory_by_internal_id")',
  '_active_overlay_panel.call("open_civil_memory_by_internal_id", _player_history_timeline_recovery_internal_identity, _player_history_timeline_recovery_focus_payload)',
  '_player_history_timeline_recovery_surface_open_reason = "civil_memory_opened_exact_focus" if exact_civil_memory_opened else ("civil_memory_opened_pending_focus" if _player_history_timeline_recovery_identity_resolved else "civil_memory_opened_via_world_event_activity")',
]) {
  assert.ok(surfaceOpen.includes(requiredHostFact), `host Civil Memory exact focus should include ${requiredHostFact}`)
}

for (const requiredPanelFact of [
  'var resolved_id := civil_memory_id.strip_edges()',
  'if resolved_id == "":',
  'return false',
  '_focused_civil_memory_internal_id = resolved_id',
  '_civil_memory_focus_requested = true',
  'call("set_active_page_id", "world_affairs")',
  'return true',
]) {
  assert.ok(focusApi.includes(requiredPanelFact), `WorldEventActivityPanel focus API should include ${requiredPanelFact}`)
}

for (const requiredSummaryFact of [
  '"civilMemoryFocusRequested": _civil_memory_focus_requested',
  '"civilMemoryFocusIdResolved": _focused_civil_memory_internal_id != ""',
]) {
  assert.ok(activitySummary.includes(requiredSummaryFact), `summary should expose safe focus status ${requiredSummaryFact}`)
}

for (const forbiddenRawId of [
  '"civilMemoryFocusId"',
  '"focusedCivilMemoryId"',
  '_focused_civil_memory_internal_id,',
]) {
  assert.equal(activitySummary.includes(forbiddenRawId), false, `summary must not expose raw Civil Memory id: ${forbiddenRawId}`)
}

console.log('[godot_player_history_timeline_recovery_civil_memory_exact_focus_contract] all checks passed')
