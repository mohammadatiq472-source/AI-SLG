import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import { buildReleaseCandidateGateSteps } from '../../scripts/run_release_candidate_gate'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

const snapshotPath = 'ops/release-artifacts/local-dev.release-candidate-dry-run-snapshot.json'
const validatorScript = 'scripts/validate_release_candidate_dry_run_snapshot.ts'
const stage842Guard = 'release_candidate_dry_run_snapshot_guard'

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['release:candidate:dry-run-snapshot:check'],
  'tsx scripts/validate_release_candidate_dry_run_snapshot.ts',
  'package.json must expose the release candidate dry-run snapshot validator',
)
assert.equal(
  packageJson.scripts?.['test:release-candidate-dry-run-snapshot-stage842-contract'],
  'tsx server/tests/release_candidate_dry_run_snapshot_stage842_contract.test.ts',
  'package.json must expose the Stage 842 release candidate dry-run snapshot contract',
)

assert.ok(existsSync(snapshotPath), `missing release candidate dry-run snapshot: ${snapshotPath}`)
const snapshot = JSON.parse(readUtf8(snapshotPath)) as {
  status: string
  profileId: string
  dryRunCommand: string
  nonStarting: boolean
  steps: Array<{ index: number; name: string; args: string[] }>
  nonClaims: string[]
}

assert.equal(snapshot.status, 'current Stage 842 release candidate dry-run snapshot')
assert.equal(snapshot.profileId, 'local-dev')
assert.equal(snapshot.dryRunCommand, 'npm.cmd run release:candidate -- --profile local-dev --dry-run')
assert.equal(snapshot.nonStarting, true)
assert.deepEqual(
  snapshot.steps,
  buildReleaseCandidateGateSteps('local-dev').map((step, index) => ({
    index: index + 1,
    name: step.name,
    args: step.args,
  })),
  'dry-run snapshot must match current release candidate step builder',
)
for (const nonClaim of [
  'does not run release:candidate:local-dev',
  'does not run Godot export',
  'does not start server:dev or tsx watch',
]) {
  assert.ok(snapshot.nonClaims.includes(nonClaim), `missing non-claim: ${nonClaim}`)
}

const validator = readUtf8(validatorScript)
assertIncludes(validator, snapshotPath, 'dry-run snapshot validator')
assertIncludes(validator, 'buildReleaseCandidateGateSteps', 'dry-run snapshot validator')
assertIncludes(validator, 'release candidate dry-run snapshot drift', 'dry-run snapshot validator')

const checklist = readUtf8('ops/release-artifacts/local-dev.release-boundary-mandatory-artifacts.json')
assertIncludes(checklist, 'release_candidate_dry_run_snapshot', 'mandatory artifact checklist')
assertIncludes(checklist, snapshotPath, 'mandatory artifact checklist')

const workflow = readUtf8('.github/workflows/release-candidate-boundary-gate.yml')
assertIncludes(workflow, 'releaseCandidateDryRunSnapshot', 'release candidate workflow')
assertIncludes(workflow, snapshotPath, 'release candidate workflow')

const archiveDoc = readUtf8('docs/RELEASE_CANDIDATE_GITHUB_ACTIONS_RUN_ARCHIVE_CURRENT_2026_06_16.md')
assertIncludes(archiveDoc, snapshotPath, 'GitHub archive doc')
assertIncludes(archiveDoc, 'release candidate dry-run snapshot', 'GitHub archive doc')

const current = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const token of [
  'Stage 842 - Release Candidate Dry-run Snapshot Guard',
  snapshotPath,
  'does not run `release:candidate:local-dev`, Godot export, full visual smoke, `server:dev`, or `tsx watch`',
]) {
  assertIncludes(current, token, 'CURRENT handoff')
}

const progress = JSON.parse(readUtf8('ops/release-artifacts/local-dev.boundary-convergence-progress.json')) as {
  completedStages: Array<{ stageId: number | string; status: string; evidence: string[] }>
  mandatoryGuards: string[]
}
const stage842 = progress.completedStages.find((stage) => stage.stageId === 842)
assert.ok(stage842, 'Stage 826 progress manifest must record Stage 842')
assert.equal(stage842.status, 'formal-green-static-release-candidate-dry-run-snapshot')
assert.ok(stage842.evidence.includes(snapshotPath))
assert.ok(
  progress.mandatoryGuards.includes(stage842Guard),
  'Stage 826 progress manifest must require the Stage 842 dry-run snapshot guard',
)

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 842', 'split target')
assertIncludes(splitTarget, 'releaseCandidateDryRunSnapshot', 'split target')

const megaPlan = readUtf8('docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md')
assertIncludes(megaPlan, 'Stage 842', 'mega plan')
assertIncludes(megaPlan, stage842Guard, 'mega plan')
