import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import {
  buildReleaseGithubActionsRunArchiveChecks,
  parseReleaseGithubActionsRunArchiveArgs,
  releaseGithubActionsRunArchiveChecklistPath,
  validateReleaseGithubActionsRunArchive,
} from '../../scripts/validate_release_github_actions_run_archive'

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['release:github-actions-run-archive:check'],
  'tsx scripts/validate_release_github_actions_run_archive.ts',
  'package.json must expose the formal GitHub Actions hosted run archive gate',
)
assert.equal(
  packageJson.scripts?.['test:release-github-actions-run-archive-contract'],
  'tsx server/tests/release_github_actions_run_archive_contract.test.ts',
  'package.json must expose the GitHub Actions hosted run archive contract test',
)

assert.deepEqual(parseReleaseGithubActionsRunArchiveArgs([]), { profileId: 'local-dev' })
assert.deepEqual(parseReleaseGithubActionsRunArchiveArgs(['--profile', 'local-dev']), { profileId: 'local-dev' })
assert.deepEqual(parseReleaseGithubActionsRunArchiveArgs(['--profile=local-dev']), { profileId: 'local-dev' })
assert.throws(
  () => parseReleaseGithubActionsRunArchiveArgs(['--profile', '../prod']),
  /invalid release GitHub Actions run archive profile id/,
  'profile ids must reject path traversal',
)

const checklistPath = releaseGithubActionsRunArchiveChecklistPath('local-dev')
assert.equal(
  checklistPath,
  'docs/RELEASE_CANDIDATE_GITHUB_ACTIONS_RUN_ARCHIVE_CURRENT_2026_06_16.md',
)
assert.ok(existsSync(checklistPath), `missing GitHub Actions run archive checklist: ${checklistPath}`)

const checklistDoc = readFileSync(checklistPath, 'utf8')
assert.ok(
  checklistDoc.includes('Status: current GitHub Actions release candidate run archive contract'),
  'checklist must identify itself as the current GitHub Actions run archive contract',
)

const checklistMatch = checklistDoc.match(/```json\s*\n([\s\S]*?)\n```/)
assert.ok(checklistMatch, 'checklist must contain a machine-readable JSON block')
const checklist = JSON.parse(checklistMatch[1]) as {
  status: string
  workflow: string
  ciCommand: string
  runArchive: {
    summaryJsonPath: string
    artifactName: string
    retentionDays: number
    runUrlExpression: string
    requiredGithubContext: string[]
  }
  archivedPaths: string[]
  boundaryEvidencePaths: string[]
  failureReasonClassifier: {
    summaryJsonField: string
    requiredCategories: Array<{ id: string; nextActionHint: string }>
  }
  failureSummary: {
    stepName: string
    statusEnv: string
    requiredFields: string[]
  }
  antiFreezeSummary: {
    summaryHeading: string
    serviceProcessGuard: string
    serviceLaunchBoundaryRegistry: string
    releaseDryRunStep1: string
    releaseDryRunStep2: string
    releaseDryRunStep3: string
    releaseDryRunStep4: string
    releaseDryRunStep5: string
    duplicateLaunchAllowed: boolean
    hostedSummaryNonClaim: string
  }
  currentHandoffPasteBlock: {
    summaryJsonField: string
    targetPath: string
    requiredFields: string[]
  }
  currentHandoff: {
    path: string
    requiredHostedRunFields: string[]
  }
}

assert.equal(checklist.status, 'current GitHub Actions release candidate run archive contract')
assert.equal(checklist.workflow, '.github/workflows/release-candidate-boundary-gate.yml')
assert.equal(checklist.ciCommand, 'npm run ci:release-candidate:local-dev')
assert.deepEqual(checklist.runArchive, {
  summaryJsonPath: 'tmp/release_candidate_github_actions_run_summary.json',
  artifactName: 'release-candidate-local-dev',
  retentionDays: 14,
  runUrlExpression: '${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}',
  requiredGithubContext: [
    'GITHUB_RUN_ID',
    'GITHUB_RUN_ATTEMPT',
    'GITHUB_REPOSITORY',
    'GITHUB_REF_NAME',
    'GITHUB_SHA',
    'GITHUB_WORKFLOW',
  ],
})

for (const requiredArchivedPath of [
  'tmp/release_candidate_github_actions_run_summary.json',
  'tmp/godot_release_export_stdout.log',
  'tmp/godot_release_export_stderr.log',
  'ops/release-artifacts/generated/*.json',
  'ops/release-artifacts/local-dev.ops-release-checklist.json',
  'ops/release-artifacts/local-dev.boundary-convergence-progress.json',
  'ops/release-artifacts/local-dev.boundary-change-registration.json',
  'ops/release-artifacts/local-dev.gameplay-anchor-evidence-template.json',
  'ops/release-artifacts/local-dev.gameplay-anchor-registry.json',
  'ops/release-artifacts/local-dev.tmp-evidence-retention.json',
  'ops/release-artifacts/local-dev.service-launch-boundary-registry.json',
  'ops/release-artifacts/local-dev.release-boundary-mandatory-artifacts.json',
  'ops/release-artifacts/local-dev.direct-backend-spawn-guard-index.json',
  'ops/release-artifacts/local-dev.release-candidate-dry-run-snapshot.json',
  'ops/release-artifacts/local-dev.solo-local-release-gate-matrix.json',
  'ops/release-artifacts/local-dev.solo-local-static-suite.json',
  'ops/release-artifacts/local-dev.release-boundary-artifact-coverage.json',
  'ops/release-artifacts/local-dev.release-github-actions-summary-local-replay.json',
  'ops/release-artifacts/local-dev.release-boundary-historical-artifact-retention.json',
  'ops/release-artifacts/local-dev.release-boundary-historical-artifact-cleanup-policy.json',
  'exports/windows/SLG Commander.exe',
]) {
  assert.ok(
    checklist.archivedPaths.includes(requiredArchivedPath),
    `missing hosted run archived path: ${requiredArchivedPath}`,
  )
}
assert.deepEqual(checklist.boundaryEvidencePaths, [
  'ops/release-artifacts/local-dev.boundary-convergence-progress.json',
  'ops/release-artifacts/local-dev.boundary-change-registration.json',
  'ops/release-artifacts/local-dev.gameplay-anchor-evidence-template.json',
  'ops/release-artifacts/local-dev.gameplay-anchor-registry.json',
  'ops/release-artifacts/local-dev.tmp-evidence-retention.json',
  'ops/release-artifacts/local-dev.service-launch-boundary-registry.json',
  'ops/release-artifacts/local-dev.release-boundary-mandatory-artifacts.json',
  'ops/release-artifacts/local-dev.direct-backend-spawn-guard-index.json',
  'ops/release-artifacts/local-dev.release-candidate-dry-run-snapshot.json',
  'ops/release-artifacts/local-dev.solo-local-release-gate-matrix.json',
  'ops/release-artifacts/local-dev.solo-local-static-suite.json',
  'ops/release-artifacts/local-dev.release-boundary-artifact-coverage.json',
  'ops/release-artifacts/local-dev.release-github-actions-summary-local-replay.json',
  'ops/release-artifacts/local-dev.release-boundary-historical-artifact-retention.json',
  'ops/release-artifacts/local-dev.release-boundary-historical-artifact-cleanup-policy.json',
])
assert.equal(checklist.failureReasonClassifier.summaryJsonField, 'failureReasonClassifier')
assert.deepEqual(
  checklist.failureReasonClassifier.requiredCategories.map((item) => item.id),
  [
    'runnerProvisioning',
    'godotProvisioning',
    'godotExport',
    'gameplayAnchorRegistry',
    'releaseArtifactDrift',
    'opsRecovery',
    'artifactUpload',
    'unknown',
  ],
)
assert.equal(
  checklist.failureReasonClassifier.requiredCategories.every((item) => item.nextActionHint.trim().length > 0),
  true,
)

assert.deepEqual(checklist.failureSummary, {
  stepName: 'Summarize release candidate artifacts',
  statusEnv: 'RELEASE_CANDIDATE_JOB_STATUS',
  requiredFields: [
    'jobStatus',
    'runUrl',
    'artifactName',
    'summaryJsonPath',
    'godotStdoutLog',
    'godotStderrLog',
    'boundaryEvidence',
    'gameplayAnchorRegistry',
    'boundaryConvergenceProgress',
    'failureReasonClassifier',
    'likelyFailureCategory',
    'nextActionHint',
    'currentHandoffPasteBlock',
    'triageOwner',
  ],
})
assert.deepEqual(checklist.antiFreezeSummary, {
  summaryHeading: 'Anti-freeze release preflight',
  serviceProcessGuard: 'npm.cmd run ops:service-process-guard',
  serviceLaunchBoundaryRegistry: 'ops/release-artifacts/local-dev.service-launch-boundary-registry.json',
  releaseDryRunStep1: 'validate service launch boundary registry',
  releaseDryRunStep2: 'validate direct backend spawn guard index',
  releaseDryRunStep3: 'validate solo-local release gate matrix',
  releaseDryRunStep4: 'validate release boundary mandatory artifacts',
  releaseDryRunStep5: 'run Godot release export wrapper',
  duplicateLaunchAllowed: false,
  hostedSummaryNonClaim: 'summary-only; does not start server:dev, tsx watch, Godot runtime, or smoke backend',
})
assert.deepEqual(checklist.currentHandoffPasteBlock, {
  summaryJsonField: 'currentHandoffPasteBlock',
  targetPath: 'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md',
  requiredFields: [
    'stage',
    'runUrl',
    'runId',
    'runAttempt',
    'jobStatus',
    'artifactName',
    'summaryJsonPath',
    'boundaryEvidence',
    'failureReasonClassifier',
    'likelyFailureCategory',
    'nextActionHint',
  ],
})
assert.deepEqual(checklist.currentHandoff, {
  path: 'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md',
  requiredHostedRunFields: [
    'runUrl',
    'runId',
    'runAttempt',
    'jobStatus',
    'artifactName',
    'summaryJsonPath',
    'boundaryEvidence',
    'gameplayAnchorRegistry',
    'boundaryConvergenceProgress',
    'failureReasonClassifier',
    'likelyFailureCategory',
    'nextActionHint',
    'failureSummary',
    'currentHandoffPasteBlock',
  ],
})

const workflow = readFileSync('.github/workflows/release-candidate-boundary-gate.yml', 'utf8')
for (const requiredWorkflowToken of [
  'Write GitHub Actions run archive summary',
  'RELEASE_CANDIDATE_JOB_STATUS: ${{ job.status }}',
  'RELEASE_CANDIDATE_RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}',
  'tmp/release_candidate_github_actions_run_summary.json',
  'GITHUB_RUN_ID',
  'GITHUB_RUN_ATTEMPT',
  'GITHUB_REPOSITORY',
  'GITHUB_REF_NAME',
  'GITHUB_SHA',
  'GITHUB_WORKFLOW',
  'failureSummary',
  'boundaryEvidence',
  'gameplayAnchorRegistry',
  'failureReasonClassifier',
  'likelyFailureCategory',
  'nextActionHint',
  'currentHandoffPasteBlock',
  '#### CURRENT handoff paste block',
  '#### Anti-freeze release preflight',
  'releaseDryRunStep1',
  'releaseDryRunStep2',
  'releaseDryRunStep3',
  'releaseDryRunStep4',
  'releaseDryRunStep5',
  'validate solo-local release gate matrix',
  'validate direct backend spawn guard index',
  'duplicateLaunchAllowed',
  'hostedSummaryNonClaim',
  'tmp/release_candidate_github_actions_run_summary.json.currentHandoffPasteBlock',
  '#### Failure classifier',
  'ops/release-artifacts/local-dev.boundary-convergence-progress.json',
  'ops/release-artifacts/local-dev.boundary-change-registration.json',
  'ops/release-artifacts/local-dev.gameplay-anchor-evidence-template.json',
  'ops/release-artifacts/local-dev.gameplay-anchor-registry.json',
  'ops/release-artifacts/local-dev.tmp-evidence-retention.json',
  'ops/release-artifacts/local-dev.service-launch-boundary-registry.json',
  'ops/release-artifacts/local-dev.release-boundary-mandatory-artifacts.json',
  'ops/release-artifacts/local-dev.direct-backend-spawn-guard-index.json',
  'ops/release-artifacts/local-dev.release-candidate-dry-run-snapshot.json',
  'ops/release-artifacts/local-dev.solo-local-release-gate-matrix.json',
  'ops/release-artifacts/local-dev.solo-local-static-suite.json',
  'ops/release-artifacts/local-dev.release-boundary-artifact-coverage.json',
  'ops/release-artifacts/local-dev.release-github-actions-summary-local-replay.json',
  'ops/release-artifacts/local-dev.release-boundary-historical-artifact-retention.json',
  'ops/release-artifacts/local-dev.release-boundary-historical-artifact-cleanup-policy.json',
  'serviceLaunchBoundaryRegistry',
  'releaseBoundaryMandatoryArtifacts',
  'directBackendSpawnGuardIndex',
  'releaseCandidateDryRunSnapshot',
  'soloLocalReleaseGateMatrix',
  'soloLocalStaticSuite',
  'releaseBoundaryArtifactCoverage',
  'releaseGithubActionsSummaryLocalReplay',
  'releaseBoundaryHistoricalArtifactRetention',
  'releaseBoundaryHistoricalArtifactCleanupPolicy',
  'triageOwner',
  'ConvertTo-Json -Depth 8',
  'Summarize release candidate artifacts',
  'actions/upload-artifact@v4',
  'retention-days: 14',
]) {
  assert.ok(workflow.includes(requiredWorkflowToken), `workflow must include hosted run archive token: ${requiredWorkflowToken}`)
}

const currentHandoff = readFileSync(checklist.currentHandoff.path, 'utf8')
for (const requiredHandoffToken of [
  'Stage 807 - GitHub Actions Hosted Run Archive And Failure Summary',
  'Stage 831 - GitHub Actions Boundary Artifact Archive Guard',
  'Stage 832 - GitHub Actions Failure Classifier Guard',
  'Stage 833 - GitHub Actions CURRENT Handoff Paste Block Guard',
  'Hosted run archive fields',
  'tmp/release_candidate_github_actions_run_summary.json',
  'boundaryEvidence',
  'failureReasonClassifier',
  'failureSummary',
  'currentHandoffPasteBlock',
]) {
  assert.ok(currentHandoff.includes(requiredHandoffToken), `CURRENT handoff must include hosted run archive token: ${requiredHandoffToken}`)
}

const checks = buildReleaseGithubActionsRunArchiveChecks({ profileId: 'local-dev' })
assert.deepEqual(
  checks.map((check) => [check.label, check.status]),
  [
    ['GitHub Actions run archive checklist', 'present'],
    ['workflow archive summary JSON', 'declared'],
    ['hosted run context fields', 'declared'],
    ['artifact upload includes run archive', 'declared'],
    ['failure classifier guidance', 'declared'],
    ['failure summary guidance', 'declared'],
    ['anti-freeze release preflight summary', 'declared'],
    ['CURRENT handoff paste block guidance', 'declared'],
    ['CURRENT handoff hosted run fields', 'declared'],
  ],
)
assert.equal(checks.every((check) => check.ok), true)

const result = validateReleaseGithubActionsRunArchive({ profileId: 'local-dev' })
assert.equal(result.profileId, 'local-dev')
assert.equal(result.ok, true, result.errors.join('; '))

console.log('[release_github_actions_run_archive_contract] all checks passed')
