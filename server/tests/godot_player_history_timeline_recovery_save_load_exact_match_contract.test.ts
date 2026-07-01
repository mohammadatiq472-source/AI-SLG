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
const current = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')

assert.ok(
  packageJson.includes('"test:godot:player-history-timeline-recovery-save-load-exact-match-contract"'),
  'package.json must expose the save-load exact-match recovery contract',
)

assert.ok(
  authority.includes('Stage 528 Godot timeline recovery save-load exact-match status') &&
    authority.includes('`npm.cmd run test:godot:player-history-timeline-recovery-save-load-exact-match-contract`'),
  'authority must record the Stage 528 save-load exact-match gate',
)

assert.ok(
  current.includes('Stage 528 - Godot timeline recovery save-load exact match') &&
    current.includes('save_load_restore_opened_exact_match'),
  'CURRENT handoff must record the Stage 528 exact-match boundary',
)

const resolver = functionSource(mainSource, 'func _resolve_player_history_timeline_recovery_surface(recovery_kind: String) -> String:')
assert.ok(resolver.includes('"save"') && resolver.includes('"save_load"'), 'resolver must map save to save_load')

const handler = functionSource(mainSource, 'func _on_player_history_timeline_recovery_requested(recovery_kind: String) -> void:')
assert.ok(
  handler.includes('target_surface == "dedicated_replay" or target_surface == "battle_report_detail" or target_surface == "save_load"'),
  'host handler must schedule save_load target-surface open',
)

const panelApi = functionSource(playerHistoryPanel, 'func open_save_restore_by_internal_id(slot_id: String) -> bool:')
for (const required of [
  'var resolved_slot_id := slot_id.strip_edges()',
  'if resolved_slot_id == "":',
  'return false',
  'for slot_summary in _save_slot_summaries:',
  'slotSummary',
]) {
  if (required === 'slotSummary') continue
  assert.ok(panelApi.includes(required), `PlayerHistoryPanel save-load API must include ${required}`)
}
assert.ok(
  panelApi.includes('str(slot_summary.get("slotId", "")).strip_edges() == resolved_slot_id') &&
    panelApi.includes('_on_save_slot_restore_pressed(null, slot_summary)') &&
    panelApi.includes('return _save_restore_feedback_text.strip_edges() != ""'),
  'PlayerHistoryPanel save-load API must select the matching slot through existing restore feedback',
)

const surfaceOpen = functionSource(mainSource, 'func _open_player_history_timeline_recovery_surface(target_surface: String) -> void:')
for (const required of [
  'if resolved_surface == "save_load":',
  '_open_overlay_panel("player_history")',
  '"open_save_restore_by_internal_id"',
  'exact_slot_opened = bool(panel_node.call("open_save_restore_by_internal_id", _player_history_timeline_recovery_internal_identity))',
  '"save_load_restore_opened_exact_match" if exact_slot_opened else',
  '"save_load_restore_opened_pending_match"',
  '"save_load_restore_opened_default"',
  '"player_history/timeline_recovery/save_load"',
  '"存档恢复"',
]) {
  assert.ok(surfaceOpen.includes(required), `host save-load branch must include ${required}`)
}

const summarySource = functionSource(playerHistoryPanel, 'func get_player_history_visual_smoke_summary() -> Dictionary:')
for (const requiredSummary of [
  '"saveRestoreSelectedSlotId"',
  '"saveRestoreSelectedSlotLabel"',
  '"saveRestorePrepared"',
]) {
  assert.ok(summarySource.includes(requiredSummary), `save-load summary must expose ${requiredSummary}`)
}

for (const forbiddenPublicCopy of ['rawSaveSlotId', 'saveSlotIdLabel', 'sourceRefs']) {
  assert.equal(panelApi.includes(forbiddenPublicCopy), false, `save-load API must not add visible/raw copy field ${forbiddenPublicCopy}`)
}

console.log('[godot_player_history_timeline_recovery_save_load_exact_match_contract] all checks passed')
