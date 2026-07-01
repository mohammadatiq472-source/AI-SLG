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

const packageJson = read('package.json')
const playerHistoryPanel = read('godot-client/scripts/ui/player_history_panel.gd')
const mainSource = read('godot-client/scripts/app/main.gd')
const visualSmokeRunner = read('godot-client/tools/run_mainline_visual_smoke.py')
const worldService = read('server/src/application/world/WorldService.ts')
const playerHistoryDomain = read('shared/domain/playerHistory.ts')
const radar = read('docs/PLAYER_HISTORY_PRODUCER_COVERAGE_RADAR_CURRENT_2026_06_13.md')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const courtAuthority = read('docs/PRODUCT_AUTHORITY_COURT_DECISION_CURRENT_2026_06_11.md')
const handoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
const index = read('docs/PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md')

assert.ok(
  packageJson.includes('"test:godot:player-history-court-recovery-civil-memory-contract"'),
  'package.json must expose the Court recovery Civil Memory contract command',
)

for (const doc of [radar, authority, courtAuthority, handoff, index]) {
  assert.ok(doc.includes('Stage 607'), 'current docs must record Stage 607')
  assert.ok(
    doc.includes('test:godot:player-history-court-recovery-civil-memory-contract'),
    'current docs must record the Court recovery UI gate',
  )
}

for (const backendFact of [
  'playerHistoryCivilMemoryId',
  'playerHistoryScope: \'private_court\'',
  'playerHistorySharePolicy: \'not_shareable_private\'',
]) {
  assert.ok(worldService.includes(backendFact), `Court producer should keep private Civil Memory anchor: ${backendFact}`)
}

for (const domainFact of [
  'const worldEventCivilMemoryIds = collectReferencedCivilMemoryIds(input.events ?? [])',
  'civilMemoryId: readMetadataString(event, \'playerHistoryCivilMemoryId\')',
  'entry.type === \'court_resolution\'',
]) {
  assert.ok(playerHistoryDomain.includes(domainFact), `player-history read model should keep safe Court/Civil Memory behavior: ${domainFact}`)
}

assert.ok(
  playerHistoryPanel.includes('PLAYER_HISTORY_COURT_RECOVERY_TOKEN := "player_history_court_civil_memory_recovery_v1"'),
  'PlayerHistoryPanel must define a Court recovery token for smoke evidence',
)

const kindResolver = functionSource(playerHistoryPanel, 'func _resolve_timeline_recovery_action_kind(source_refs: Dictionary, category: String = "") -> String:')
assert.ok(
  kindResolver.indexOf('source_refs.get("civilMemoryId"') >= 0 &&
    kindResolver.indexOf('source_refs.get("civilMemoryId"') < kindResolver.indexOf('source_refs.get("worldEventId"'),
  'Civil Memory anchors must win over generic world-event anchors for Court recovery',
)

const courtSmoke = functionSource(playerHistoryPanel, 'func run_court_timeline_recovery_smoke() -> Dictionary:')
for (const requiredSmokeFact of [
  '_on_timeline_recovery_pressed(feedback_label, "civil_memory", "court_civil_memory_recovery_smoke"',
  '"title": "朝议结果已归档"',
  '"nextActionLabel": "查看朝议"',
  '"courtRecoveryToken": PLAYER_HISTORY_COURT_RECOVERY_TOKEN',
  '"timelineRecoverySelectedPayloadResolved": not _timeline_recovery_selected_focus_payload.is_empty()',
]) {
  assert.ok(courtSmoke.includes(requiredSmokeFact), `Court recovery smoke should include ${requiredSmokeFact}`)
}

for (const forbiddenVisibleTerm of [
  'sourceRefs',
  'read model',
  'authority',
  'backend',
  'contract id',
  'fixture',
  'debug',
]) {
  assert.equal(courtSmoke.includes(forbiddenVisibleTerm), false, `Court recovery visible smoke copy should not leak ${forbiddenVisibleTerm}`)
}

const dispatch = functionSource(mainSource, 'func _run_mainline_visual_smoke_click_action(click_action: String, panel_id: String) -> Dictionary:')
assert.ok(
  dispatch.includes('"player_history_court_recovery_civil_memory":') &&
    dispatch.includes('return await _press_mainline_visual_smoke_player_history_court_recovery_civil_memory(panel_id)'),
  'main visual smoke dispatch must expose the Court recovery click action',
)

const courtVisualSmoke = functionSource(mainSource, 'func _press_mainline_visual_smoke_player_history_court_recovery_civil_memory(panel_id: String) -> Dictionary:')
for (const requiredVisualSmokeFact of [
  'run_court_timeline_recovery_smoke',
  '_player_history_timeline_recovery_host_kind == "civil_memory"',
  '_player_history_timeline_recovery_host_surface == "civil_memory"',
  'recovery_reason == "civil_memory_opened_exact_focus"',
  'recovery_reason == "civil_memory_opened_pending_focus"',
  'recovery_reason == "civil_memory_opened_via_world_event_activity"',
  '"courtRecoveryVisualSmokeContract"',
  '"courtRecoveryScreenshotPath"',
]) {
  assert.ok(courtVisualSmoke.includes(requiredVisualSmokeFact), `Court visual smoke should include ${requiredVisualSmokeFact}`)
}

const surfaceOpen = functionSource(mainSource, 'func _open_player_history_timeline_recovery_surface(target_surface: String) -> void:')
for (const requiredSurfaceFact of [
  'if resolved_surface == "civil_memory":',
  '_open_overlay_panel("world_event")',
  '_active_overlay_panel.has_method("open_civil_memory_by_internal_id")',
  '_active_overlay_panel.call("open_civil_memory_by_internal_id", _player_history_timeline_recovery_internal_identity, _player_history_timeline_recovery_focus_payload)',
  '_apply_overlay_feedback("player_history/timeline_recovery/civil_memory", "opened", "传闻已定位")',
]) {
  assert.ok(surfaceOpen.includes(requiredSurfaceFact), `Court recovery host should retain Civil Memory surface fact: ${requiredSurfaceFact}`)
}

assert.ok(
  visualSmokeRunner.includes('"player_history_court_recovery_civil_memory"'),
  'formal visual smoke runner must whitelist the Court recovery click action',
)

console.log('[godot_player_history_court_recovery_civil_memory_contract] all checks passed')
