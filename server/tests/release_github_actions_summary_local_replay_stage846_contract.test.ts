import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

const replayPath = 'ops/release-artifacts/local-dev.release-github-actions-summary-local-replay.json'
const archiveDocPath = 'docs/RELEASE_CANDIDATE_GITHUB_ACTIONS_RUN_ARCHIVE_CURRENT_2026_06_16.md'
const stage846Guard = 'release_github_actions_summary_local_replay_guard'

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['release:github-actions-summary-local-replay:check'],
  'tsx scripts/validate_release_github_actions_summary_local_replay.ts',
  'package.json must expose the hosted summary local replay validator',
)
assert.equal(
  packageJson.scripts?.['test:release-github-actions-summary-local-replay-stage846-contract'],
  'tsx server/tests/release_github_actions_summary_local_replay_stage846_contract.test.ts',
  'package.json must expose the Stage 846 hosted summary local replay contract',
)

assert.ok(existsSync(replayPath), `missing local replay manifest: ${replayPath}`)
const replay = JSON.parse(readUtf8(replayPath)) as {
  status: string
  profileId: string
  replayMode: string
  sourceWorkflow: string
  summaryJsonPath: string
  fixtureSummary: {
    runUrl: string
    runId: string
    runAttempt: string
    jobStatus: string
    artifactName: string
    summaryJsonPath: string
    boundaryEvidence: Record<string, string>
    failureReasonClassifier: {
      likelyFailureCategory: string
      nextActionHint: string
      requiredCategories: string[]
    }
    currentHandoffPasteBlock: Record<string, unknown>
  }
  requiredArchiveDocFields: string[]
  nonClaims: string[]
}

assert.equal(replay.status, 'current Stage 846 release GitHub Actions summary local replay')
assert.equal(replay.profileId, 'local-dev')
assert.equal(replay.replayMode, 'local-fixture-only')
assert.equal(replay.sourceWorkflow, '.github/workflows/release-candidate-boundary-gate.yml')
assert.equal(replay.summaryJsonPath, 'tmp/release_candidate_github_actions_run_summary.json')
assert.equal(replay.fixtureSummary.runUrl, 'local-fixture-no-hosted-run')
assert.equal(replay.fixtureSummary.runId, 'local-fixture')
assert.equal(replay.fixtureSummary.runAttempt, '0')
assert.equal(replay.fixtureSummary.jobStatus, 'summary-fixture')
assert.equal(replay.fixtureSummary.artifactName, 'release-candidate-local-dev')
assert.equal(replay.fixtureSummary.summaryJsonPath, replay.summaryJsonPath)

for (const [key, path] of Object.entries({
  boundaryConvergenceProgress: 'ops/release-artifacts/local-dev.boundary-convergence-progress.json',
  releaseBoundaryMandatoryArtifacts: 'ops/release-artifacts/local-dev.release-boundary-mandatory-artifacts.json',
  releaseBoundaryArtifactCoverage: 'ops/release-artifacts/local-dev.release-boundary-artifact-coverage.json',
  releaseGithubActionsSummaryLocalReplay: 'ops/release-artifacts/local-dev.release-github-actions-summary-local-replay.json',
  soloLocalReleaseGateMatrix: 'ops/release-artifacts/local-dev.solo-local-release-gate-matrix.json',
  soloLocalStaticSuite: 'ops/release-artifacts/local-dev.solo-local-static-suite.json',
  releaseBoundaryHistoricalArtifactRetention:
    'ops/release-artifacts/local-dev.release-boundary-historical-artifact-retention.json',
  releaseBoundaryHistoricalArtifactCleanupPolicy:
    'ops/release-artifacts/local-dev.release-boundary-historical-artifact-cleanup-policy.json',
})) {
  assert.equal(replay.fixtureSummary.boundaryEvidence[key], path, `missing boundary evidence ${key}`)
  assert.ok(existsSync(path), `boundary evidence path must exist: ${path}`)
}

assert.equal(replay.fixtureSummary.failureReasonClassifier.likelyFailureCategory, 'unknown')
assert.equal(
  replay.fixtureSummary.failureReasonClassifier.nextActionHint,
  'Use failureReasonClassifier with the failed workflow step name and start from the matching nextActionHint.',
)
assert.deepEqual(replay.fixtureSummary.failureReasonClassifier.requiredCategories, [
  'runnerProvisioning',
  'godotProvisioning',
  'godotExport',
  'gameplayAnchorRegistry',
  'releaseArtifactDrift',
  'opsRecovery',
  'artifactUpload',
  'unknown',
])
for (const field of [
  'runUrl',
  'runId',
  'runAttempt',
  'jobStatus',
  'artifactName',
  'summaryJsonPath',
  'boundaryEvidence',
  'failureReasonClassifier',
  'currentHandoffPasteBlock',
]) {
  assert.ok(replay.requiredArchiveDocFields.includes(field), `missing archive doc field: ${field}`)
  assert.ok(field in replay.fixtureSummary.currentHandoffPasteBlock, `missing paste block field: ${field}`)
}
for (const nonClaim of [
  'does not claim hosted GitHub Actions run evidence',
  'does not run release:candidate:local-dev',
  'does not start server:dev or tsx watch',
]) {
  assert.ok(replay.nonClaims.includes(nonClaim), `missing non-claim: ${nonClaim}`)
}

const validator = readUtf8('scripts/validate_release_github_actions_summary_local_replay.ts')
for (const token of [replayPath, 'local-fixture-only', 'currentHandoffPasteBlock', 'failureReasonClassifier']) {
  assertIncludes(validator, token, 'summary local replay validator')
}

const archiveDoc = readUtf8(archiveDocPath)
assertIncludes(archiveDoc, replayPath, 'GitHub archive doc')

const mandatory = readUtf8('ops/release-artifacts/local-dev.release-boundary-mandatory-artifacts.json')
assertIncludes(mandatory, 'release_github_actions_summary_local_replay', 'mandatory checklist')
assertIncludes(mandatory, replayPath, 'mandatory checklist')

const coverage = readUtf8('ops/release-artifacts/local-dev.release-boundary-artifact-coverage.json')
assertIncludes(coverage, replayPath, 'coverage manifest')
assertIncludes(coverage, 'hosted summary local replay', 'coverage manifest')

const current = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const token of [
  'Stage 846 - Release GitHub Actions Summary Local Replay Guard',
  replayPath,
  'does not claim hosted GitHub Actions run evidence',
  'does not run `release:candidate:local-dev`, Godot export, full visual smoke, `server:dev`, or `tsx watch`',
]) {
  assertIncludes(current, token, 'CURRENT handoff')
}

const progress = JSON.parse(readUtf8('ops/release-artifacts/local-dev.boundary-convergence-progress.json')) as {
  completedStages: Array<{ stageId: number | string; status: string; evidence: string[] }>
  mandatoryGuards: string[]
}
const stage846 = progress.completedStages.find((stage) => stage.stageId === 846)
assert.ok(stage846, 'Stage 826 progress manifest must record Stage 846')
assert.equal(stage846.status, 'formal-green-static-release-github-actions-summary-local-replay')
assert.ok(stage846.evidence.includes(replayPath))
assert.ok(progress.mandatoryGuards.includes(stage846Guard), 'Stage 826 must require Stage 846 guard')

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 846', 'split target')
assertIncludes(splitTarget, 'hosted summary local replay', 'split target')

const megaPlan = readUtf8('docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md')
assertIncludes(megaPlan, 'Stage 846', 'mega plan')
assertIncludes(megaPlan, stage846Guard, 'mega plan')
