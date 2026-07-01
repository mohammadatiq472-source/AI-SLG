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
  packageJson.includes('"test:godot:player-history-timeline-recovery-host-navigation-contract"'),
  'package.json must expose the Godot timeline recovery host navigation contract',
)

assert.ok(
  authority.includes('Stage 521 Godot timeline recovery host navigation status') &&
    authority.includes('`npm.cmd run test:godot:player-history-timeline-recovery-host-navigation-contract`'),
  'authority must record the Godot timeline recovery host navigation gate',
)

assert.ok(
  playerHistoryPanel.includes('signal timeline_recovery_requested(recovery_kind: String)'),
  'PlayerHistoryPanel must continue exposing the typed recovery signal',
)

assert.ok(
  mainSource.includes('PLAYER_HISTORY_TIMELINE_RECOVERY_HOST_NAV_TOKEN := "player_history_timeline_recovery_host_nav_v1"'),
  'main host must expose a stable recovery host navigation token',
)

const builder = functionSource(mainSource, 'func _build_player_history_panel_content() -> Control:')
assert.ok(
  builder.includes('panel.has_signal("timeline_recovery_requested")') &&
    builder.includes('panel.connect("timeline_recovery_requested", Callable(self, "_on_player_history_timeline_recovery_requested"))'),
  'main host must connect PlayerHistoryPanel timeline recovery signal',
)

const handler = functionSource(mainSource, 'func _on_player_history_timeline_recovery_requested(recovery_kind: String) -> void:')
for (const requiredHandlerFact of [
  '_player_history_timeline_recovery_host_count += 1',
  '_player_history_timeline_recovery_host_kind = resolved_kind',
  '_player_history_timeline_recovery_host_surface = target_surface',
  '_player_history_timeline_recovery_host_feedback = _resolve_player_history_timeline_recovery_feedback(target_surface)',
  '"player_history/timeline_recovery/%s" % target_surface',
]) {
  assert.ok(handler.includes(requiredHandlerFact), `host handler must record ${requiredHandlerFact}`)
}

const resolver = functionSource(mainSource, 'func _resolve_player_history_timeline_recovery_surface(recovery_kind: String) -> String:')
for (const mapping of [
  ['"replay"', '"dedicated_replay"'],
  ['"battle_report"', '"battle_report_detail"'],
  ['"save"', '"save_load"'],
  ['"civil_memory"', '"civil_memory"'],
  ['"world_event"', '"world_timeline"'],
]) {
  assert.ok(resolver.includes(mapping[0]) && resolver.includes(mapping[1]), `host resolver must map ${mapping[0]} to ${mapping[1]}`)
}

const feedbackResolver = functionSource(mainSource, 'func _resolve_player_history_timeline_recovery_feedback(target_surface: String) -> String:')
for (const playerSafeCopy of ['已准备打开复盘', '已准备打开战报', '已准备查看存档', '已准备查看传闻', '已准备查看大事']) {
  assert.ok(feedbackResolver.includes(playerSafeCopy), `host resolver should expose player-safe copy ${playerSafeCopy}`)
}

const summarySource = functionSource(mainSource, 'func _read_mainline_visual_smoke_player_history_summary() -> Dictionary:')
const hostSmoke = functionSource(mainSource, 'func _run_mainline_visual_smoke_player_history_timeline_recovery_host_navigation() -> Dictionary:')
const panelOpenSmoke = functionSource(mainSource, 'func _press_mainline_visual_smoke_player_history_panel_open(panel_id: String) -> Dictionary:')
for (const requiredSummaryFact of [
  '"timelineRecoveryHostNavigationToken"',
  '"timelineRecoveryHostNavigationCount"',
  '"timelineRecoveryHostNavigationKind"',
  '"timelineRecoveryHostNavigationSurface"',
  '"timelineRecoveryHostNavigationFeedback"',
]) {
  assert.ok(summarySource.includes(requiredSummaryFact), `host summary must expose ${requiredSummaryFact}`)
  assert.ok(hostSmoke.includes(requiredSummaryFact), `host smoke must expose ${requiredSummaryFact}`)
  assert.ok(panelOpenSmoke.includes(requiredSummaryFact), `panel-open smoke must verify ${requiredSummaryFact}`)
}

assert.ok(
  hostSmoke.includes('panel_node.call("run_timeline_recovery_action_smoke")') &&
    hostSmoke.includes('_player_history_timeline_recovery_host_surface != "player_history"') &&
    panelOpenSmoke.includes('"timelineRecoveryHostNavigationSmoke"') &&
    panelOpenSmoke.includes('_run_mainline_visual_smoke_player_history_timeline_recovery_host_navigation()'),
  'formal player-history open smoke must trigger the host navigation bridge',
)

for (const forbiddenRawId of [
  'replayRequestId',
  'worldEventId',
  'saveSlotId',
  'civilMemoryId',
  'battleReportId',
  'sourceRefs',
]) {
  assert.equal(handler.includes(forbiddenRawId), false, `host handler must not expose raw id ${forbiddenRawId}`)
  assert.equal(hostSmoke.includes(forbiddenRawId), false, `host smoke must not expose raw id ${forbiddenRawId}`)
}

console.log('[godot_player_history_timeline_recovery_host_navigation_contract] all checks passed')
