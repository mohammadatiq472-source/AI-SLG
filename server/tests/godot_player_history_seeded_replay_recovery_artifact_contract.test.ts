import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

const verifier = read('godot-client/tools/verify_player_history_seeded_replay_recovery_artifact.py')
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const current = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')

assert.ok(
  packageJson.includes('"godot:player-history:seeded-replay-recovery-artifact"') &&
    packageJson.includes('verify_player_history_seeded_replay_recovery_artifact.py'),
  'package.json must expose a formal artifact verifier command',
)

assert.ok(
  packageJson.includes('"test:godot:player-history-seeded-replay-recovery-artifact-contract"'),
  'package.json must expose the artifact verifier contract test',
)

assert.ok(
  authority.includes('Stage 525 Godot seeded replay recovery artifact verifier status') &&
    authority.includes('`npm.cmd run test:godot:player-history-seeded-replay-recovery-artifact-contract`'),
  'authority must record the Stage 525 artifact verifier gate',
)

assert.ok(
  current.includes('Stage 525 - Godot seeded replay recovery artifact verifier') &&
    current.includes('godot:player-history:seeded-replay-recovery-artifact'),
  'CURRENT handoff must record the Stage 525 artifact verifier and command',
)

for (const required of [
  'CONTRACT_ID = "player_history_seeded_replay_recovery_artifact_v1"',
  'EXPECTED_CLICK_ACTION = "player_history_seeded_replay_panel_open"',
  'EXPECTED_SMOKE_CONTRACT = "player_history_seeded_replay_recovery_identity_visual_smoke_v1"',
  'parser.add_argument("--summary", required=True',
  'parser.add_argument("--output", default=""',
  'summary.get("formalContractFailures") not in ([], None)',
  'summary.get("screenshotVisibilityGate", {})',
  'summary.get("screenshotStats", {})',
  'artifacts.get("screenshot", "")',
  'seededReplayRecoveryIdentityResolved',
  'seededReplayRecoveryFrameLoaded',
  'seededReplayRecoveryFrameCount',
  'dedicated_replay_identity_opened',
  'dedicatedReplayScreenOpen',
  'replayFrameLoaded',
  'replayUnavailableCopyVisible',
  'timelineRecoveryReplayIdentityResolved',
]) {
  assert.ok(verifier.includes(required), `artifact verifier must check ${required}`)
}

for (const forbidden of [
  'seededReplayRecoveryReplayRequestId',
  'timelineRecoveryReplayIdentity"',
  'replayRequestId"',
]) {
  assert.equal(verifier.includes(forbidden), false, `artifact verifier must not require raw identity field ${forbidden}`)
}

console.log('[godot_player_history_seeded_replay_recovery_artifact_contract] all checks passed')
