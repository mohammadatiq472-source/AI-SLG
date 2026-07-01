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
  packageJson.includes('"test:godot:player-history-timeline-recovery-battle-report-exact-match-contract"'),
  'package.json must expose the battle-report exact-match recovery contract',
)

assert.ok(
  authority.includes('Stage 527 Godot timeline recovery battle-report exact-match status') &&
    authority.includes('`npm.cmd run test:godot:player-history-timeline-recovery-battle-report-exact-match-contract`'),
  'authority must record the Stage 527 battle-report exact-match gate',
)

assert.ok(
  current.includes('Stage 527 - Godot timeline recovery battle-report exact match') &&
    current.includes('battle_report_detail_opened_exact_match'),
  'CURRENT handoff must record the Stage 527 exact-match boundary',
)

const panelApi = functionSource(battleReportPanel, 'func open_report_detail_by_internal_id(report_id: String) -> bool:')
for (const required of [
  'var resolved_report_id := report_id.strip_edges()',
  'if resolved_report_id == "":',
  'return false',
  '_resolve_display_list_entry_contracts(_resolve_list_entry_contracts())',
  'candidate_id == resolved_report_id',
  '_selected_report_id = resolved_report_id',
  '_active_page_id = "detail"',
  '_active_detail_tab_id = DEFAULT_DETAIL_TAB_ID',
  '_refresh_view()',
  'return true',
]) {
  assert.ok(panelApi.includes(required), `BattleReportPanel exact-match API must include ${required}`)
}

const surfaceOpen = functionSource(mainSource, 'func _open_player_history_timeline_recovery_surface(target_surface: String) -> void:')
for (const required of [
  'var exact_match_opened := false',
  '_player_history_timeline_recovery_identity_resolved',
  '_active_overlay_panel.has_method("open_report_detail_by_internal_id")',
  'exact_match_opened = bool(_active_overlay_panel.call("open_report_detail_by_internal_id", _player_history_timeline_recovery_internal_identity))',
  'if not exact_match_opened',
  '"battle_report_detail_opened_exact_match" if exact_match_opened else',
  '"battle_report_detail_opened_pending_match"',
  '"battle_report_detail_opened_default"',
]) {
  assert.ok(surfaceOpen.includes(required), `host exact-match branch must include ${required}`)
}

const panelSummary = functionSource(battleReportPanel, 'func get_mainline_visual_smoke_summary(page_id: String = "") -> Dictionary:')
assert.ok(
  panelSummary.includes('"selectedReportId": _selected_report_id') &&
    panelSummary.includes('"battleReportListCardSelectedReportId": _selected_report_id'),
  'BattleReportPanel smoke summary must continue exposing selected report state for internal verification',
)

for (const forbiddenPublicCopy of [
  'battleReportIdLabel',
  'rawBattleReportId',
  'sourceRefs',
]) {
  assert.equal(panelApi.includes(forbiddenPublicCopy), false, `panel exact-match API must not add visible/raw copy field ${forbiddenPublicCopy}`)
}

console.log('[godot_player_history_timeline_recovery_battle_report_exact_match_contract] all checks passed')
