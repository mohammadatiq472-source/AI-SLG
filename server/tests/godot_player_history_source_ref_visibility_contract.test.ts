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
  packageJson.includes('"test:godot:player-history-source-ref-visibility-contract"'),
  'package.json must expose the Godot source-ref visibility contract',
)
assert.ok(
  authority.includes('Stage 518 Godot sourceRef consumer enforcement status') &&
    authority.includes('`npm.cmd run test:godot:player-history-source-ref-visibility-contract`'),
  'authority must record the Godot sourceRef consumer enforcement gate',
)

const rebuildTimeline = functionSource(playerHistoryPanel, 'func _rebuild_timeline(timeline: Dictionary) -> void:')
const sanitizer = functionSource(playerHistoryPanel, 'func _sanitize_timeline_card_for_visible_copy(card: Dictionary) -> Dictionary:')
const summarySource = functionSource(playerHistoryPanel, 'func get_player_history_visual_smoke_summary() -> Dictionary:')

assert.ok(
  rebuildTimeline.includes('var visible_card := _sanitize_timeline_card_for_visible_copy(card)') &&
    rebuildTimeline.includes('visible_card.get("title"') &&
    rebuildTimeline.includes('visible_card.get("summary"') &&
    rebuildTimeline.includes('visible_card.get("resultLabel"'),
  'timeline renderer must render visible copy only from sanitized card fields',
)

for (const forbiddenRendererRead of [
  'card.get("sourceRefs"',
  'card.get("id"',
  'card.get("sourceRefsVisible"',
  'card.get("replayRequestId"',
  'card.get("worldEventId"',
  'card.get("saveSlotId"',
  'card.get("civilMemoryId"',
]) {
  assert.equal(
    rebuildTimeline.includes(forbiddenRendererRead),
    false,
    `timeline renderer must not read internal source ref field for visible copy: ${forbiddenRendererRead}`,
  )
}

for (const requiredSanitizerFact of [
  'card.get("sourceRefs", {})',
  'source_refs.get("visibility", "")',
  '"internal_link_only"',
  'source_refs.get("visible", true)',
  '"sourceRefsInternalOnly": source_refs_internal_only',
]) {
  assert.ok(sanitizer.includes(requiredSanitizerFact), `sanitizer must prove internal source-ref policy: ${requiredSanitizerFact}`)
}

const visibleReturnStart = sanitizer.indexOf('return {')
const visibleReturnEnd = sanitizer.indexOf('\n\t}', visibleReturnStart)
assert.ok(visibleReturnStart >= 0 && visibleReturnEnd > visibleReturnStart, 'sanitizer should expose a return dictionary')
const visibleReturnSlice = sanitizer.slice(visibleReturnStart, visibleReturnEnd)
for (const forbiddenVisibleField of [
  'replayRequestId',
  'worldEventId',
  'saveSlotId',
  'civilMemoryId',
  'battleReportId',
  'sourceRefs":',
]) {
  assert.equal(
    visibleReturnSlice.includes(forbiddenVisibleField),
    false,
    `sanitized visible card must not return internal source ref field: ${forbiddenVisibleField}`,
  )
}

for (const forbiddenSummaryField of [
  'sourceRefs',
  'replayRequestId',
  'worldEventId',
  'saveSlotId',
  'civilMemoryId',
]) {
  assert.equal(summarySource.includes(forbiddenSummaryField), false, `visual smoke summary must not expose ${forbiddenSummaryField}`)
}

console.log('[godot_player_history_source_ref_visibility_contract] all checks passed')
