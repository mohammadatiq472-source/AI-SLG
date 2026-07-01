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
const battleReportPanel = read('godot-client/scripts/ui/battle_report_panel.gd')
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const current = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')

assert.ok(
  packageJson.includes('"test:godot:player-history-timeline-recovery-battle-report-surface-contract"'),
  'package.json must expose the battle-report recovery surface contract',
)

assert.ok(
  authority.includes('Stage 526 Godot timeline recovery battle-report surface status') &&
    authority.includes('`npm.cmd run test:godot:player-history-timeline-recovery-battle-report-surface-contract`'),
  'authority must record the Stage 526 battle-report recovery surface gate',
)

assert.ok(
  current.includes('Stage 526 - Godot timeline recovery battle-report surface open') &&
    current.includes('battle_report_detail_opened_pending_match'),
  'CURRENT handoff must record the Stage 526 pending-match boundary',
)

const resolver = functionSource(mainSource, 'func _resolve_player_history_timeline_recovery_surface(recovery_kind: String) -> String:')
assert.ok(
  resolver.includes('"battle_report"') && resolver.includes('"battle_report_detail"'),
  'recovery surface resolver must map battle_report to battle_report_detail',
)

const handler = functionSource(mainSource, 'func _on_player_history_timeline_recovery_requested(recovery_kind: String) -> void:')
assert.ok(
  handler.includes('target_surface == "dedicated_replay" or target_surface == "battle_report_detail"') &&
    handler.includes('call_deferred("_open_player_history_timeline_recovery_surface", target_surface)'),
  'host recovery handler must schedule battle-report target-surface open',
)

const surfaceOpen = functionSource(mainSource, 'func _open_player_history_timeline_recovery_surface(target_surface: String) -> void:')
for (const required of [
  'if resolved_surface == "battle_report_detail":',
  '_open_overlay_panel("battle_report")',
  'open_report_detail_by_internal_id',
  '_active_overlay_panel.call("set_active_page_id", "detail")',
  '_player_history_timeline_recovery_surface_open_count += 1',
  '_player_history_timeline_recovery_surface_opened = true',
  'battle_report_detail_opened_exact_match',
  'battle_report_detail_opened_pending_match',
  '"player_history/timeline_recovery/battle_report_detail"',
  '"战报详情"',
]) {
  assert.ok(surfaceOpen.includes(required), `battle-report surface open helper must include ${required}`)
}

assert.ok(
  battleReportPanel.includes('func set_active_page_id(page_id: String) -> void:') &&
    battleReportPanel.includes('func open_report_detail_by_internal_id(report_id: String) -> bool:') &&
    battleReportPanel.includes('if resolved_tab_id == "detail":') &&
    battleReportPanel.includes('_active_page_id = "detail"'),
  'BattleReportPanel must expose an existing detail-page open API',
)

for (const forbiddenOverclaim of [
  'selected_report_id == _player_history_timeline_recovery_internal_identity',
  'battleReportId": _player_history_timeline_recovery_internal_identity',
]) {
  assert.equal(surfaceOpen.includes(forbiddenOverclaim), false, `Stage 526 must not overclaim exact battle-report match: ${forbiddenOverclaim}`)
}

for (const forbiddenRawId of [
  'replayRequestId',
  'worldEventId',
  'saveSlotId',
  'civilMemoryId',
  'battleReportId',
  'sourceRefs',
]) {
  assert.equal(handler.includes(forbiddenRawId), false, `host handler must not expose raw id ${forbiddenRawId}`)
}

console.log('[godot_player_history_timeline_recovery_battle_report_surface_contract] all checks passed')
