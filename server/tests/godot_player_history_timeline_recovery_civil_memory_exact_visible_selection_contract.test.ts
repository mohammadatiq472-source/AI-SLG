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

const playerHistoryPanel = read('godot-client/scripts/ui/player_history_panel.gd')
const mainSource = read('godot-client/scripts/app/main.gd')
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')

assert.ok(
  packageJson.includes('"test:godot:player-history-timeline-recovery-civil-memory-exact-visible-selection-contract"'),
  'package.json must expose Civil Memory exact visible selection contract',
)

assert.ok(
  authority.includes('Stage 540 Godot Civil Memory exact visible selection status') &&
    authority.includes('`npm.cmd run test:godot:player-history-timeline-recovery-civil-memory-exact-visible-selection-contract`'),
  'authority must record Stage 540 exact visible selection gate',
)

for (const selectedState of [
  'var _timeline_recovery_selected_kind := ""',
  'var _timeline_recovery_selected_internal_token := ""',
  'var _timeline_recovery_selected_focus_payload: Dictionary = {}',
]) {
  assert.ok(playerHistoryPanel.includes(selectedState), `PlayerHistoryPanel should keep selected state ${selectedState}`)
}

const rebuildTimeline = functionSource(playerHistoryPanel, 'func _rebuild_timeline(timeline: Dictionary) -> void:')
const tokenResolver = functionSource(playerHistoryPanel, 'func _resolve_timeline_recovery_internal_token(recovery_kind: String, source_refs: Dictionary) -> String:')
const pressHandler = functionSource(
  playerHistoryPanel,
  'func _on_timeline_recovery_pressed(feedback_label: Label, recovery_kind: String, selected_internal_token: String = "", selected_focus_payload: Dictionary = {}) -> void:',
)
const getToken = functionSource(playerHistoryPanel, 'func get_timeline_recovery_internal_token(recovery_kind: String) -> String:')
const getPayload = functionSource(playerHistoryPanel, 'func get_timeline_recovery_focus_payload(recovery_kind: String) -> Dictionary:')
const focusBuilder = functionSource(playerHistoryPanel, 'func _build_timeline_recovery_focus_payload(visible_payload: Dictionary) -> Dictionary:')
const hostIdentity = functionSource(mainSource, 'func _resolve_player_history_timeline_recovery_internal_identity(recovery_kind: String) -> String:')
const hostPayload = functionSource(mainSource, 'func _resolve_player_history_timeline_recovery_focus_payload(recovery_kind: String) -> Dictionary:')

for (const bindFact of [
  'var recovery_token := _resolve_timeline_recovery_internal_token(recovery_kind, _coerce_dictionary(card.get("sourceRefs", {})))',
  'var recovery_focus_payload := _build_timeline_recovery_focus_payload(visible_card)',
  'button.pressed.connect(_on_timeline_recovery_pressed.bind(feedback, recovery_kind, recovery_token, recovery_focus_payload))',
]) {
  assert.ok(rebuildTimeline.includes(bindFact), `timeline card button should bind exact card fact ${bindFact}`)
}

for (const tokenFact of [
  '"civil_memory":',
  'return str(source_refs.get("civilMemoryId", "")).strip_edges()',
  '"world_event":',
  'return str(source_refs.get("worldEventId", "")).strip_edges()',
]) {
  assert.ok(tokenResolver.includes(tokenFact), `token resolver should include ${tokenFact}`)
}

for (const pressFact of [
  '_timeline_recovery_selected_kind = _timeline_recovery_source_kind',
  '_timeline_recovery_selected_internal_token = selected_internal_token.strip_edges()',
  '_timeline_recovery_selected_focus_payload = _build_timeline_recovery_focus_payload(selected_focus_payload) if not selected_focus_payload.is_empty() else {}',
  'emit_signal("timeline_recovery_requested", _timeline_recovery_signal_kind)',
]) {
  assert.ok(pressHandler.includes(pressFact), `press handler should record selected card fact ${pressFact}`)
}

assert.ok(
  getToken.includes('resolved_kind == _timeline_recovery_selected_kind') &&
    getToken.includes('return _timeline_recovery_selected_internal_token.strip_edges()') &&
    getToken.includes('_timeline_recovery_internal_tokens_by_kind.get(resolved_kind, "")'),
  'token getter should prefer selected visible card token before kind fallback',
)

assert.ok(
  getPayload.includes('resolved_kind == _timeline_recovery_selected_kind') &&
    getPayload.includes('return _timeline_recovery_selected_focus_payload.duplicate(true)') &&
    getPayload.includes('_timeline_recovery_focus_payloads_by_kind.get(resolved_kind, {})'),
  'payload getter should prefer selected visible card payload before kind fallback',
)

for (const safePayloadField of [
  '"title": str(visible_payload.get("title", "")).strip_edges()',
  '"summary": str(visible_payload.get("summary", "")).strip_edges()',
  '"resultLabel": str(visible_payload.get("resultLabel", "")).strip_edges()',
  '"consequenceLabel": str(visible_payload.get("consequenceLabel", "")).strip_edges()',
  '"nextActionLabel": str(visible_payload.get("nextActionLabel", "")).strip_edges()',
]) {
  assert.ok(focusBuilder.includes(safePayloadField), `selected payload builder should keep ${safePayloadField}`)
}

assert.ok(
  hostIdentity.includes('get_timeline_recovery_internal_token') &&
    hostPayload.includes('get_timeline_recovery_focus_payload'),
  'main host should continue resolving token/payload from PlayerHistoryPanel getters',
)

for (const forbiddenVisibleLeak of [
  'civilMemoryId',
  'sourceRefs',
  'metadata',
  'integrity',
]) {
  assert.equal(focusBuilder.includes(forbiddenVisibleLeak), false, `selected focus payload must not expose ${forbiddenVisibleLeak}`)
}

console.log('[godot_player_history_timeline_recovery_civil_memory_exact_visible_selection_contract] all checks passed')
