import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function functionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const next = source.indexOf('\nfunc ', start + signature.length)
  return source.slice(start, next > start ? next : source.length)
}

const packageJson = read('package.json')
const mainSource = read('godot-client/scripts/app/main.gd')
const visualSmokeRunner = read('godot-client/tools/run_mainline_visual_smoke.py')

assert.ok(
  packageJson.includes('"test:godot:player-history-save-restore-visual-smoke-contract"'),
  'package.json must expose the player-history save-restore visual smoke contract',
)

const dispatch = functionSource(mainSource, 'func _run_mainline_visual_smoke_click_action(click_action: String, panel_id: String) -> Dictionary:')
assert.ok(
  dispatch.includes('"player_history_seeded_save_restore_panel_open":') &&
    dispatch.includes('return await _press_mainline_visual_smoke_player_history_seeded_save_restore_open(panel_id)'),
  'save-restore click action must route to the dedicated save-restore wrapper, not the generic replay-oriented panel smoke',
)

const wrapper = functionSource(
  mainSource,
  'func _press_mainline_visual_smoke_player_history_seeded_save_restore_open(panel_id: String) -> Dictionary:',
)
for (const required of [
  '_open_overlay_panel_with_page("player_history")',
  'int(summary.get("saveSlotCount", 0)) > 0',
  '_run_mainline_visual_smoke_player_history_save_restore_feedback()',
  '_scroll_mainline_visual_smoke_player_history_save_restore_into_view()',
  '"player_history_seeded_save_restore_visual_smoke_v1"',
  'saveRestoreFeedbackSmoke',
  'saveRestoreFocusScroll',
  'saveRestoreFocusScrolled',
  'saveRestorePrepared',
  'saveRestoreSelectedSlotLabel',
  'saveRestoreSelectedSavedAtLabel',
  'saveRestoreSelectedRiskLabel',
  'saveRestoreSelectedPreviewLabel',
  'not bool(summary.get("dedicatedReplayScreenOpen", false))',
]) {
  assert.ok(wrapper.includes(required), `save-restore wrapper must include ${required}`)
}

const focusScroll = functionSource(
  mainSource,
  'func _scroll_mainline_visual_smoke_player_history_save_restore_into_view() -> Dictionary:',
)
for (const required of [
  '"PlayerHistoryScroll"',
  '"SaveSlotRestoreButton"',
  'scroll.scroll_vertical',
  'save_restore_focus_scrolled',
]) {
  assert.ok(focusScroll.includes(required), `save-restore focus scroll must include ${required}`)
}

for (const forbiddenReplayCoupling of [
  '_run_mainline_visual_smoke_player_history_timeline_recovery_host_navigation',
  'timelineRecoveryHostNavigationSmoke',
  'dedicated_replay_identity_opened',
]) {
  assert.equal(
    wrapper.includes(forbiddenReplayCoupling),
    false,
    `save-restore wrapper must not depend on replay recovery logic: ${forbiddenReplayCoupling}`,
  )
}

assert.ok(
  visualSmokeRunner.includes('"player_history_seeded_save_restore_panel_open"') &&
    visualSmokeRunner.includes('def _seed_player_history_save_restore(args: argparse.Namespace) -> dict[str, Any]:') &&
    visualSmokeRunner.includes('"sessionTokenPresent": bool(session_token)') &&
    visualSmokeRunner.includes('history_data.get("saveLoad", {})'),
  'runner must keep the seeded save-restore formal action and validate player-history saveLoad after authenticated tooling seed',
)

console.log('[godot_player_history_save_restore_visual_smoke_contract] all checks passed')
