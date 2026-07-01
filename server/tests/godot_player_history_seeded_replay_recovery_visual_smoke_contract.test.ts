import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function functionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const nextFunc = source.indexOf('\nfunc ', start + signature.length)
  const nextDef = source.indexOf('\ndef ', start + signature.length)
  const candidates = [nextFunc, nextDef].filter((index) => index > start)
  const end = candidates.length > 0 ? Math.min(...candidates) : source.length
  return source.slice(start, end)
}

const mainSource = read('godot-client/scripts/app/main.gd')
const visualSmokeRunner = read('godot-client/tools/run_mainline_visual_smoke.py')
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')

assert.ok(
  packageJson.includes('"test:godot:player-history-seeded-replay-recovery-visual-smoke-contract"'),
  'package.json must expose the seeded replay recovery visual smoke contract',
)

assert.ok(
  authority.includes('Stage 524 Godot seeded replay recovery visual-smoke gate status') &&
    authority.includes('`npm.cmd run test:godot:player-history-seeded-replay-recovery-visual-smoke-contract`'),
  'authority must record the seeded replay recovery visual-smoke gate',
)

assert.ok(
  visualSmokeRunner.includes('"player_history_seeded_replay_panel_open"') &&
    visualSmokeRunner.includes('def _seed_player_history_replay(args: argparse.Namespace) -> dict[str, Any]:') &&
    visualSmokeRunner.includes('replayRequestId={urllib.parse.quote(request_id)}') &&
    visualSmokeRunner.includes('"historyReplayFrameCount": len(frames)'),
  'runner must seed a player-history replay and verify backend replay frames before Godot starts',
)

const dispatch = functionSource(mainSource, 'func _run_mainline_visual_smoke_click_action(click_action: String, panel_id: String) -> Dictionary:')
assert.ok(
  dispatch.includes('"player_history_seeded_replay_panel_open":') &&
    dispatch.includes('return await _press_mainline_visual_smoke_player_history_seeded_replay_identity_open(panel_id)'),
  'main click-action dispatch must route seeded replay to the stricter identity visual-smoke wrapper',
)

const wrapper = functionSource(mainSource, 'func _press_mainline_visual_smoke_player_history_seeded_replay_identity_open(panel_id: String) -> Dictionary:')
for (const requiredWrapperFact of [
  'await _press_mainline_visual_smoke_player_history_panel_open(panel_id)',
  'bool(summary.get("timelineRecoveryReplayIdentityResolved", false))',
  'str(summary.get("timelineRecoverySurfaceOpenReason", "")) == "dedicated_replay_identity_opened"',
  'bool(summary.get("dedicatedReplayScreenOpen", false))',
  'bool(summary.get("replayFrameLoaded", false))',
  'not bool(summary.get("replayUnavailableCopyVisible", false))',
  'int(summary.get("replayFrameCount", 0)) > 0',
  '"player_history_seeded_replay_recovery_identity_visual_smoke_v1"',
  '"seededReplayRecoveryScreenshotPath"',
]) {
  assert.ok(wrapper.includes(requiredWrapperFact), `seeded replay wrapper must verify ${requiredWrapperFact}`)
}

const visualValidator = functionSource(
  visualSmokeRunner,
  'def _validate_player_history_seeded_replay_recovery_identity_visual_smoke(',
)
for (const requiredValidatorFact of [
  'click_action != "player_history_seeded_replay_panel_open"',
  'seededReplayRecoveryVisualSmokeContract',
  'player_history_seeded_replay_recovery_identity_visual_smoke_v1',
  'seededReplayRecoveryIdentityResolved',
  'seededReplayRecoveryFrameLoaded',
  'seededReplayRecoveryFrameCount',
  'dedicatedReplayScreenOpen',
  'replayUnavailableCopyVisible',
  'screenshot_visibility_gate.get("ok", False)',
  'seededReplayRecoveryScreenshotPath',
]) {
  assert.ok(visualValidator.includes(requiredValidatorFact), `runner validator must enforce ${requiredValidatorFact}`)
}

assert.ok(
  visualSmokeRunner.includes(
    'contract_failures.extend(_validate_player_history_seeded_replay_recovery_identity_visual_smoke(args.click_action, godot_report, screenshot_visibility_gate))',
  ),
  'runner must wire the seeded replay recovery visual-smoke validator into formalContractFailures',
)

for (const forbiddenRawExposure of [
  '"seededReplayRecoveryReplayRequestId"',
  '"timelineRecoveryReplayIdentity"',
  '"replayRequestId"',
]) {
  assert.equal(wrapper.includes(forbiddenRawExposure), false, `wrapper must not expose raw replay identity field ${forbiddenRawExposure}`)
  assert.equal(visualValidator.includes(forbiddenRawExposure), false, `validator must not require raw replay identity field ${forbiddenRawExposure}`)
}

console.log('[godot_player_history_seeded_replay_recovery_visual_smoke_contract] all checks passed')
