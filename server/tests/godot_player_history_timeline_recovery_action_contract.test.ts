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
  packageJson.includes('"test:godot:player-history-timeline-recovery-action-contract"'),
  'package.json must expose the Godot timeline recovery action contract',
)
assert.ok(
  authority.includes('Stage 519 Godot timeline recovery action status') &&
    authority.includes('`npm.cmd run test:godot:player-history-timeline-recovery-action-contract`'),
  'authority must record the Godot timeline recovery action gate',
)

const rebuildTimeline = functionSource(playerHistoryPanel, 'func _rebuild_timeline(timeline: Dictionary) -> void:')
const sanitizer = functionSource(playerHistoryPanel, 'func _sanitize_timeline_card_for_visible_copy(card: Dictionary) -> Dictionary:')
const recoveryResolver = functionSource(playerHistoryPanel, 'func _resolve_timeline_recovery_action_kind(source_refs: Dictionary, category: String = "") -> String:')
const recoveryHandler = functionSource(
  playerHistoryPanel,
  'func _on_timeline_recovery_pressed(feedback_label: Label, recovery_kind: String, selected_internal_token: String = "", selected_focus_payload: Dictionary = {}) -> void:',
)
const recoverySmoke = functionSource(playerHistoryPanel, 'func run_timeline_recovery_action_smoke() -> Dictionary:')
const summarySource = functionSource(playerHistoryPanel, 'func get_player_history_visual_smoke_summary() -> Dictionary:')

assert.ok(
  rebuildTimeline.includes('"TimelineCardRecoveryButton%02d"') &&
    rebuildTimeline.includes('"TimelineCardRecoveryFeedback%02d"') &&
    rebuildTimeline.includes('"player_history_timeline_recovery"') &&
    rebuildTimeline.includes('button.pressed.connect(_on_timeline_recovery_pressed.bind(feedback, recovery_kind, recovery_token, recovery_focus_payload))') &&
    rebuildTimeline.includes('_timeline_recovery_action_count += 1'),
  'timeline renderer must expose a real recovery button bound to a safe action handler',
)

for (const requiredResolverFact of [
  'source_refs.get("replayRequestId", "")',
  'source_refs.get("battleReportId", "")',
  'source_refs.get("saveSlotId", "")',
  'source_refs.get("civilMemoryId", "")',
  'source_refs.get("worldEventId", "")',
]) {
  assert.ok(recoveryResolver.includes(requiredResolverFact), `recovery resolver must support ${requiredResolverFact}`)
}

assert.ok(
  sanitizer.includes('var recovery_kind := _resolve_timeline_recovery_action_kind(source_refs, str(card.get("category", "")).strip_edges()) if source_refs_internal_only else ""') &&
    sanitizer.includes('_register_timeline_recovery_internal_token(recovery_kind, source_refs)') &&
    sanitizer.includes('"recoveryActionKind": recovery_kind'),
  'sanitizer must derive only a safe recovery action kind from internal source refs',
)
assert.ok(
  recoveryHandler.includes('_timeline_recovery_feedback_text = str(PLAYER_HISTORY_VISIBLE_LABELS.get("recoveryReady"') &&
    recoveryHandler.includes('PLAYER_HISTORY_UI_COMPONENT_FACTORY.apply_motion_reward_glow(feedback_label)'),
  'recovery handler must set player-safe feedback and motion without exposing raw ids',
)
assert.ok(
  recoverySmoke.includes('TimelineCardRecoveryFeedback01') &&
    recoverySmoke.includes('_on_timeline_recovery_pressed(feedback_label, "replay")') &&
    recoverySmoke.includes('"timelineRecoveryActionCount"') &&
    recoverySmoke.includes('"timelineRecoveryFeedbackText"') &&
    recoverySmoke.includes('"timelineRecoverySourceKind"'),
  'recovery smoke must exercise the timeline recovery action path',
)

for (const summaryField of [
  '"timelineRecoveryActionCount"',
  '"timelineRecoveryFeedbackText"',
  '"timelineRecoverySourceKind"',
]) {
  assert.ok(summarySource.includes(summaryField), `visual smoke summary should expose ${summaryField}`)
}

for (const forbiddenRawId of [
  'replayRequestId',
  'worldEventId',
  'saveSlotId',
  'civilMemoryId',
  'battleReportId',
  'sourceRefs',
]) {
  assert.equal(
    summarySource.includes(forbiddenRawId),
    false,
    `visual smoke summary must not expose raw source ref field ${forbiddenRawId}`,
  )
  assert.equal(
    recoveryHandler.includes(forbiddenRawId),
    false,
    `recovery handler must not expose raw source ref field ${forbiddenRawId}`,
  )
}

console.log('[godot_player_history_timeline_recovery_action_contract] all checks passed')
