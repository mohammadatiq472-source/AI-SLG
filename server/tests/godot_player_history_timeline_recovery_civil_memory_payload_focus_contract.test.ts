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
const playerHistoryPanel = read('godot-client/scripts/ui/player_history_panel.gd')
const worldEventActivityPanel = read('godot-client/scripts/ui/world_event_activity_panel.gd')
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')

assert.ok(
  packageJson.includes('"test:godot:player-history-timeline-recovery-civil-memory-payload-focus-contract"'),
  'package.json must expose the Civil Memory payload focus contract command',
)

assert.ok(
  authority.includes('Stage 536 Godot Civil Memory payload focus status') &&
    authority.includes('`npm.cmd run test:godot:player-history-timeline-recovery-civil-memory-payload-focus-contract`'),
  'authority must record the Civil Memory payload focus gate',
)

const sanitizer = functionSource(playerHistoryPanel, 'func _sanitize_timeline_card_for_visible_copy(card: Dictionary) -> Dictionary:')
const registerPayload = functionSource(playerHistoryPanel, 'func _register_timeline_recovery_focus_payload(recovery_kind: String, visible_payload: Dictionary) -> void:')
const buildPayload = functionSource(playerHistoryPanel, 'func _build_timeline_recovery_focus_payload(visible_payload: Dictionary) -> Dictionary:')
const getPayload = functionSource(playerHistoryPanel, 'func get_timeline_recovery_focus_payload(recovery_kind: String) -> Dictionary:')
const hostHandler = functionSource(mainSource, 'func _on_player_history_timeline_recovery_requested(recovery_kind: String) -> void:')
const resolvePayload = functionSource(mainSource, 'func _resolve_player_history_timeline_recovery_focus_payload(recovery_kind: String) -> Dictionary:')
const surfaceOpen = functionSource(mainSource, 'func _open_player_history_timeline_recovery_surface(target_surface: String) -> void:')
const focusApi = functionSource(worldEventActivityPanel, 'func open_civil_memory_by_internal_id(civil_memory_id: String, focus_payload: Dictionary = {}) -> bool:')
const sanitizeFocusPayload = functionSource(worldEventActivityPanel, 'func _sanitize_civil_memory_focus_payload(payload: Dictionary) -> Dictionary:')
const insertBlock = functionSource(worldEventActivityPanel, 'func _insert_civil_memory_focus_block() -> bool:')

for (const panelFact of [
  '_timeline_recovery_focus_payloads_by_kind',
  '_register_timeline_recovery_focus_payload(recovery_kind, visible_payload)',
  'get_timeline_recovery_focus_payload',
]) {
  assert.ok(playerHistoryPanel.includes(panelFact), `PlayerHistoryPanel should include ${panelFact}`)
}

for (const safeField of [
  '"title": str(visible_payload.get("title", "")).strip_edges()',
  '"summary": str(visible_payload.get("summary", "")).strip_edges()',
  '"resultLabel": str(visible_payload.get("resultLabel", "")).strip_edges()',
  '"consequenceLabel": str(visible_payload.get("consequenceLabel", "")).strip_edges()',
  '"nextActionLabel": str(visible_payload.get("nextActionLabel", "")).strip_edges()',
]) {
  assert.ok(buildPayload.includes(safeField), `payload builder should keep safe field ${safeField}`)
}

assert.ok(
  sanitizer.includes('var visible_payload :=') &&
    sanitizer.includes('_register_timeline_recovery_focus_payload(recovery_kind, visible_payload)') &&
    registerPayload.includes('_build_timeline_recovery_focus_payload(visible_payload)') &&
    getPayload.includes('duplicate(true)'),
  'panel should register and expose only duplicated safe focus payload',
)

assert.ok(
  hostHandler.includes('_player_history_timeline_recovery_focus_payload = _resolve_player_history_timeline_recovery_focus_payload(resolved_kind)') &&
    resolvePayload.includes('"get_timeline_recovery_focus_payload"') &&
    resolvePayload.includes('panel_node.call("get_timeline_recovery_focus_payload", recovery_kind.strip_edges())'),
  'host should resolve safe focus payload from the owning PlayerHistoryPanel',
)

assert.ok(
  surfaceOpen.includes('_active_overlay_panel.call("open_civil_memory_by_internal_id", _player_history_timeline_recovery_internal_identity, _player_history_timeline_recovery_focus_payload)'),
  'host should pass internal id plus safe focus payload to the world-event activity panel',
)

for (const apiFact of [
  'func open_civil_memory_by_internal_id(civil_memory_id: String, focus_payload: Dictionary = {}) -> bool:',
  '_civil_memory_focus_payload = _sanitize_civil_memory_focus_payload(focus_payload)',
]) {
  assert.ok(focusApi.includes(apiFact), `focus API should include ${apiFact}`)
}

for (const safePanelField of [
  '"title": str(payload.get("title", "")).strip_edges()',
  '"summary": str(payload.get("summary", "")).strip_edges()',
  '"resultLabel": str(payload.get("resultLabel", "")).strip_edges()',
  '"consequenceLabel": str(payload.get("consequenceLabel", "")).strip_edges()',
  '"nextActionLabel": str(payload.get("nextActionLabel", "")).strip_edges()',
]) {
  assert.ok(sanitizeFocusPayload.includes(safePanelField), `panel sanitizer should keep ${safePanelField}`)
}

for (const visiblePayloadFact of [
  'var focus_title := str(_civil_memory_focus_payload.get("title", "传闻已定位")).strip_edges()',
  'var focus_summary := str(_civil_memory_focus_payload.get("summary", "已为你打开相关传闻。")).strip_edges()',
  'var focus_result := str(_civil_memory_focus_payload.get("resultLabel", "传闻已定位")).strip_edges()',
  'var focus_next := str(_civil_memory_focus_payload.get("nextActionLabel", "可在这里查看相关局势与传闻线索。")).strip_edges()',
  '"title": focus_title',
  '"value": focus_summary',
  '"description": focus_next',
]) {
  assert.ok(insertBlock.includes(visiblePayloadFact), `visible block should use safe payload fact ${visiblePayloadFact}`)
}

for (const forbiddenRawField of [
  'sourceRefs',
  'civilMemoryId',
  'worldEventId',
  'replayRequestId',
  'saveSlotId',
  'battleReportId',
]) {
  assert.equal(buildPayload.includes(forbiddenRawField), false, `registered payload must not include ${forbiddenRawField}`)
  assert.equal(sanitizeFocusPayload.includes(forbiddenRawField), false, `panel payload sanitizer must not include ${forbiddenRawField}`)
  assert.equal(insertBlock.includes(forbiddenRawField), false, `visible block must not include ${forbiddenRawField}`)
}

console.log('[godot_player_history_timeline_recovery_civil_memory_payload_focus_contract] all checks passed')
