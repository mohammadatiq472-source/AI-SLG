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
  packageJson.includes('"test:godot:player-history-timeline-recovery-surface-open-contract"'),
  'package.json must expose the Godot timeline recovery surface-open contract',
)

assert.ok(
  authority.includes('Stage 522 Godot timeline recovery dedicated replay fallback-open status') &&
    authority.includes('`npm.cmd run test:godot:player-history-timeline-recovery-surface-open-contract`'),
  'authority must record the Godot timeline recovery surface-open gate',
)

const handler = functionSource(mainSource, 'func _on_player_history_timeline_recovery_requested(recovery_kind: String) -> void:')
assert.ok(
  handler.includes('if target_surface == "dedicated_replay":') &&
    handler.includes('call_deferred("_open_player_history_timeline_recovery_surface", target_surface)'),
  'host recovery handler must schedule a real dedicated replay surface open for replay recovery',
)

const surfaceOpen = functionSource(mainSource, 'func _open_player_history_timeline_recovery_surface(target_surface: String) -> void:')
for (const required of [
  'target_surface.strip_edges() != "dedicated_replay"',
  '_open_overlay_panel("player_history")',
  'panel_node.call("configure_dedicated_replay_mode"',
  '"originSurface": "player_history_timeline"',
  '"closeReturnTarget": "player_history"',
  '"replayUnavailableCopyVisible": not _player_history_timeline_recovery_identity_resolved',
  '_player_history_timeline_recovery_surface_open_count += 1',
  '_player_history_timeline_recovery_surface_opened = true',
  '"dedicated_replay_unavailable_opened"',
  '"回放已不可用"',
]) {
  assert.ok(surfaceOpen.includes(required), `surface-open helper must include ${required}`)
}

const hostSmoke = functionSource(mainSource, 'func _run_mainline_visual_smoke_player_history_timeline_recovery_host_navigation() -> Dictionary:')
const panelOpenSmoke = functionSource(mainSource, 'func _press_mainline_visual_smoke_player_history_panel_open(panel_id: String) -> Dictionary:')
for (const requiredSmokeFact of [
  'await get_tree().process_frame',
  '"timelineRecoverySurfaceOpenCount"',
  '"timelineRecoverySurfaceOpened"',
  '"timelineRecoverySurfaceOpenReason"',
  '"timelineRecoveryOpenedSummary"',
  'bool(opened_summary.get("dedicatedReplayScreenOpen", false))',
  'bool(opened_summary.get("replayUnavailableCopyVisible", false))',
]) {
  assert.ok(hostSmoke.includes(requiredSmokeFact), `host smoke must prove surface-open fact ${requiredSmokeFact}`)
}

for (const requiredPanelOpenFact of [
  'timeline_recovery_host_navigation_smoke = await _run_mainline_visual_smoke_player_history_timeline_recovery_host_navigation()',
  'bool(summary.get("timelineRecoverySurfaceOpened", false))',
  'str(summary.get("timelineRecoverySurfaceOpenReason", "")) == "dedicated_replay_unavailable_opened"',
  'bool(summary.get("dedicatedReplayScreenOpen", false))',
  'bool(summary.get("replayUnavailableCopyVisible", false))',
]) {
  assert.ok(panelOpenSmoke.includes(requiredPanelOpenFact), `player-history open smoke must verify ${requiredPanelOpenFact}`)
}

const summarySource = functionSource(mainSource, 'func _read_mainline_visual_smoke_player_history_summary() -> Dictionary:')
for (const summaryField of [
  '"timelineRecoverySurfaceOpenCount"',
  '"timelineRecoverySurfaceOpened"',
  '"timelineRecoverySurfaceOpenReason"',
]) {
  assert.ok(summarySource.includes(summaryField), `host summary must expose ${summaryField}`)
}

assert.ok(
  playerHistoryPanel.includes('ReplayUnavailableLabel') &&
    playerHistoryPanel.includes('"replayUnavailable": "回放已不可用"') &&
    playerHistoryPanel.includes('"dedicatedReplayScreenOpen": _dedicated_replay_mode_active') &&
    playerHistoryPanel.includes('"replayUnavailableCopyVisible": _replay_unavailable_copy_visible'),
  'PlayerHistoryPanel must expose the dedicated replay unavailable visual state',
)

for (const forbiddenRawId of [
  'replayRequestId',
  'worldEventId',
  'saveSlotId',
  'civilMemoryId',
  'battleReportId',
  'sourceRefs',
]) {
  assert.equal(surfaceOpen.includes(forbiddenRawId), false, `surface-open helper must not expose raw id ${forbiddenRawId}`)
  assert.equal(hostSmoke.includes(forbiddenRawId), false, `host smoke must not expose raw id ${forbiddenRawId}`)
}

console.log('[godot_player_history_timeline_recovery_surface_open_contract] all checks passed')
