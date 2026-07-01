import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function functionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const nextFunc = source.indexOf('\nfunc ', start + signature.length)
  const nextStaticFunc = source.indexOf('\nstatic func ', start + signature.length)
  const candidates = [nextFunc, nextStaticFunc].filter((index) => index > start)
  const end = candidates.length > 0 ? Math.min(...candidates) : source.length
  return source.slice(start, end)
}

const playerHistoryPanel = read('godot-client/scripts/ui/player_history_panel.gd')
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const handoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
const privateCourtContract = read('server/tests/player_history_private_court_shareability_contract.test.ts')
const privateDiplomacyContract = read('server/tests/player_history_private_diplomacy_shareability_contract.test.ts')

assert.ok(
  packageJson.includes('"test:godot:player-history-non-shareable-state-static-contract"'),
  'package.json must expose Godot non-shareable state static contract',
)

assert.ok(
  authority.includes('Stage 570 Godot player-history non-shareable state static status') &&
    authority.includes('`npm.cmd run test:godot:player-history-non-shareable-state-static-contract`') &&
    handoff.includes('Stage 570 - Godot player-history non-shareable state static bridge'),
  'authority and CURRENT handoff must record Stage 570 non-shareable state gate',
)

assert.ok(
  privateCourtContract.includes("playerHistorySharePolicy: 'not_shareable_private'") &&
    privateDiplomacyContract.includes("playerHistorySharePolicy: 'not_shareable_private'"),
  'Godot non-shareable state must build on Stage 568/569 private diplomacy and Court policies',
)

for (const stateFact of [
  'var _share_unavailable_card_count := 0',
  'var _share_unavailable_feedback_text := ""',
]) {
  assert.ok(playerHistoryPanel.includes(stateFact), `panel should track ${stateFact}`)
}

const rebuildTimeline = functionSource(playerHistoryPanel, 'func _rebuild_timeline(timeline: Dictionary) -> void:')
for (const rendererFact of [
  'var share_state_label := str(card.get("shareStateLabel", "")).strip_edges()',
  'if share_event_id != "":',
  'elif share_state_label != "":',
  'ShareUnavailableStateLabel%02d',
  '_share_unavailable_card_count += 1',
  '_share_unavailable_feedback_text = share_state_label',
]) {
  assert.ok(rebuildTimeline.includes(rendererFact), `timeline renderer should include ${rendererFact}`)
}

const nonShareableBranchStart = rebuildTimeline.indexOf('elif share_state_label != "":')
assert.ok(nonShareableBranchStart >= 0, 'renderer should have non-shareable branch')
const nonShareableBranchEnd = rebuildTimeline.indexOf('_root_column.add_child(panel)', nonShareableBranchStart)
const nonShareableBranch = rebuildTimeline.slice(nonShareableBranchStart, nonShareableBranchEnd)
for (const forbiddenControl of [
  'TimelineCardShareButton',
  'TimelineCardSharePreviewButton',
  'TimelineCardShareCopyButton',
  'player_history_timeline_share_token_issue',
  'player_history_timeline_share_handoff_preview',
  'player_history_timeline_share_copy_clipboard',
]) {
  assert.equal(nonShareableBranch.includes(forbiddenControl), false, `non-shareable branch must not render ${forbiddenControl}`)
}

const summary = functionSource(playerHistoryPanel, 'func get_player_history_visual_smoke_summary() -> Dictionary:')
for (const summaryFact of [
  '"shareUnavailableCardCount": _share_unavailable_card_count',
  '"shareUnavailableFeedbackText": _share_unavailable_feedback_text',
]) {
  assert.ok(summary.includes(summaryFact), `summary should include safe non-shareable field ${summaryFact}`)
}

for (const forbiddenSummaryLeak of [
  'not_shareable_private',
  'private_court',
  'organization_scope',
  'shareToken',
  'Authorization',
  'Bearer',
]) {
  assert.equal(summary.includes(forbiddenSummaryLeak), false, `summary must not expose ${forbiddenSummaryLeak}`)
}

console.log('[godot_player_history_non_shareable_state_static_contract] all checks passed')
