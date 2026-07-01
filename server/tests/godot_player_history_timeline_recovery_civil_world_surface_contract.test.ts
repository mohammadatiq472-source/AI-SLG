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
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')

assert.ok(
  packageJson.includes('"test:godot:player-history-timeline-recovery-civil-world-surface-contract"'),
  'package.json must expose the civil/world recovery surface contract command',
)

assert.ok(
  authority.includes('Stage 532 Godot timeline recovery civil/world surface status') &&
    authority.includes('`npm.cmd run test:godot:player-history-timeline-recovery-civil-world-surface-contract`'),
  'authority must record the civil/world surface gate',
)

const sanitizer = functionSource(playerHistoryPanel, 'func _sanitize_timeline_card_for_visible_copy(card: Dictionary) -> Dictionary:')
const tokenBridge = functionSource(playerHistoryPanel, 'func _register_timeline_recovery_internal_token(recovery_kind: String, source_refs: Dictionary) -> void:')
const kindResolver = functionSource(playerHistoryPanel, 'func _resolve_timeline_recovery_action_kind(source_refs: Dictionary) -> String:')
const hostHandler = functionSource(mainSource, 'func _on_player_history_timeline_recovery_requested(recovery_kind: String) -> void:')
const surfaceResolver = functionSource(mainSource, 'func _resolve_player_history_timeline_recovery_surface(recovery_kind: String) -> String:')
const surfaceOpen = functionSource(mainSource, 'func _open_player_history_timeline_recovery_surface(target_surface: String) -> void:')
const overlaySpecResolver = functionSource(mainSource, 'func _resolve_snapshot_overlay_spec(action_id: String) -> Dictionary:')

for (const panelToken of [
  'source_refs.get("civilMemoryId"',
  'source_refs.get("worldEventId"',
  '"civil_memory"',
  '"world_event"',
]) {
  assert.ok(
    sanitizer.includes(panelToken) || tokenBridge.includes(panelToken) || kindResolver.includes(panelToken),
    `PlayerHistoryPanel should keep civil/world recovery token internally: ${panelToken}`,
  )
}

for (const mapping of [
  ['"civil_memory"', '"civil_memory"'],
  ['"world_event"', '"world_timeline"'],
]) {
  assert.ok(
    surfaceResolver.includes(mapping[0]) && surfaceResolver.includes(mapping[1]),
    `host surface resolver should map ${mapping[0]} to ${mapping[1]}`,
  )
}

for (const deferredSurface of [
  'target_surface == "civil_memory"',
  'target_surface == "world_timeline"',
]) {
  assert.ok(hostHandler.includes(deferredSurface), `host handler should schedule ${deferredSurface}`)
}

for (const civilOpenFact of [
  'if resolved_surface == "civil_memory":',
  '_open_overlay_panel("world_event")',
  '"civil_memory_opened_via_world_event_activity"',
  '_apply_overlay_feedback("player_history/timeline_recovery/civil_memory", "opened", "传闻已定位")',
]) {
  assert.ok(surfaceOpen.includes(civilOpenFact), `civil memory open should include ${civilOpenFact}`)
}

for (const worldOpenFact of [
  'if resolved_surface == "world_timeline":',
  '_open_overlay_panel("world_event")',
  '_player_history_timeline_recovery_surface_open_reason = "world_timeline_opened_via_world_event_activity"',
  '_apply_overlay_feedback("player_history/timeline_recovery/world_timeline", "opened", "天下大事")',
]) {
  assert.ok(surfaceOpen.includes(worldOpenFact), `world timeline open should include ${worldOpenFact}`)
}

assert.ok(
  overlaySpecResolver.includes('"activity", "event", "world_event", "world_affairs", "tasks", "faction_status"') &&
    overlaySpecResolver.includes('_build_world_event_activity_overlay_spec(action_id)'),
  'world_event should resolve through the world-event activity overlay spec',
)

for (const forbiddenRawId of [
  'civilMemoryId',
  'worldEventId',
  'sourceRefs',
]) {
  assert.equal(hostHandler.includes(forbiddenRawId), false, `host handler must not expose ${forbiddenRawId}`)
  assert.equal(surfaceOpen.includes(forbiddenRawId), false, `surface open must not expose ${forbiddenRawId}`)
}

console.log('[godot_player_history_timeline_recovery_civil_world_surface_contract] all checks passed')
