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
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')

assert.ok(
  packageJson.includes('"test:godot:player-history-timeline-recovery-signal-contract"'),
  'package.json must expose the Godot timeline recovery signal contract',
)
assert.ok(
  authority.includes('Stage 520 Godot timeline recovery signal bridge status') &&
    authority.includes('`npm.cmd run test:godot:player-history-timeline-recovery-signal-contract`'),
  'authority must record the Godot timeline recovery signal bridge gate',
)

assert.ok(
  playerHistoryPanel.includes('signal timeline_recovery_requested(recovery_kind: String)'),
  'PlayerHistoryPanel must expose a typed timeline recovery signal',
)

const recoveryHandler = functionSource(playerHistoryPanel, 'func _on_timeline_recovery_pressed(feedback_label: Label, recovery_kind: String) -> void:')
const recoverySmoke = functionSource(playerHistoryPanel, 'func run_timeline_recovery_action_smoke() -> Dictionary:')
const summarySource = functionSource(playerHistoryPanel, 'func get_player_history_visual_smoke_summary() -> Dictionary:')

for (const requiredHandlerFact of [
  '_timeline_recovery_signal_kind = _timeline_recovery_source_kind',
  '_timeline_recovery_signal_count += 1',
  'emit_signal("timeline_recovery_requested", _timeline_recovery_signal_kind)',
]) {
  assert.ok(recoveryHandler.includes(requiredHandlerFact), `recovery handler must bridge signal fact: ${requiredHandlerFact}`)
}

for (const requiredSummaryFact of [
  '"timelineRecoverySignalCount"',
  '"timelineRecoverySignalKind"',
]) {
  assert.ok(summarySource.includes(requiredSummaryFact), `visual smoke summary should expose ${requiredSummaryFact}`)
  assert.ok(recoverySmoke.includes(requiredSummaryFact), `recovery smoke should expose ${requiredSummaryFact}`)
}

for (const forbiddenRawId of [
  'replayRequestId',
  'worldEventId',
  'saveSlotId',
  'civilMemoryId',
  'battleReportId',
  'sourceRefs',
]) {
  assert.equal(recoveryHandler.includes(forbiddenRawId), false, `signal handler must not expose raw id ${forbiddenRawId}`)
  assert.equal(summarySource.includes(forbiddenRawId), false, `summary must not expose raw id ${forbiddenRawId}`)
  assert.equal(recoverySmoke.includes(forbiddenRawId), false, `smoke must not expose raw id ${forbiddenRawId}`)
}

console.log('[godot_player_history_timeline_recovery_signal_contract] all checks passed')
