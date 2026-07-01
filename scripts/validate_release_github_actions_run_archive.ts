import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const DEFAULT_RELEASE_GITHUB_ACTIONS_RUN_ARCHIVE_PROFILE = 'local-dev'
export const RELEASE_GITHUB_ACTIONS_RUN_ARCHIVE_CHECKLIST =
  'docs/RELEASE_CANDIDATE_GITHUB_ACTIONS_RUN_ARCHIVE_CURRENT_2026_06_16.md'

export type ReleaseGithubActionsRunArchiveOptions = {
  profileId: string
}

export type ReleaseGithubActionsRunArchiveCheckStatus = 'present' | 'declared' | 'missing' | 'invalid'

export type ReleaseGithubActionsRunArchiveCheck = {
  label: string
  ok: boolean
  status: ReleaseGithubActionsRunArchiveCheckStatus
  detail?: string
}

export type ReleaseGithubActionsRunArchiveResult = {
  profileId: string
  ok: boolean
  checks: ReleaseGithubActionsRunArchiveCheck[]
  errors: string[]
}

type ReleaseGithubActionsRunArchiveChecklist = {
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
    requiredCategories: Array<{
      id: string
      nextActionHint: string
    }>
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

export function parseReleaseGithubActionsRunArchiveArgs(argv: string[]): ReleaseGithubActionsRunArchiveOptions {
  let profileId = DEFAULT_RELEASE_GITHUB_ACTIONS_RUN_ARCHIVE_PROFILE

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--profile') {
      profileId = argv[index + 1] ?? ''
      index += 1
      continue
    }
    if (arg.startsWith('--profile=')) {
      profileId = arg.slice('--profile='.length)
      continue
    }
    throw new Error(`unknown release GitHub Actions run archive argument: ${arg}`)
  }

  return { profileId: normalizeProfileId(profileId) }
}

export function releaseGithubActionsRunArchiveChecklistPath(profileId: string): string {
  normalizeProfileId(profileId)
  return RELEASE_GITHUB_ACTIONS_RUN_ARCHIVE_CHECKLIST
}

export function buildReleaseGithubActionsRunArchiveChecks(
  options: ReleaseGithubActionsRunArchiveOptions,
): ReleaseGithubActionsRunArchiveCheck[] {
  const profileId = normalizeProfileId(options.profileId)
  const checklistPath = releaseGithubActionsRunArchiveChecklistPath(profileId)
  if (!existsSync(checklistPath)) {
    return [
      {
        label: 'GitHub Actions run archive checklist',
        ok: false,
        status: 'missing',
        detail: `checklist not found: ${checklistPath}`,
      },
    ]
  }

  const checklistDoc = readFileSync(checklistPath, 'utf8')
  const checklist = parseChecklistJson(checklistDoc, checklistPath)
  const workflow = existsSync(checklist.workflow) ? readFileSync(checklist.workflow, 'utf8') : ''
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
    scripts?: Record<string, string>
  }
  const currentHandoff = existsSync(checklist.currentHandoff.path)
    ? readFileSync(checklist.currentHandoff.path, 'utf8')
    : ''

  return [
    checkResult(
      'GitHub Actions run archive checklist',
      'present',
      checklist.status === 'current GitHub Actions release candidate run archive contract' &&
        checklist.workflow === '.github/workflows/release-candidate-boundary-gate.yml' &&
        checklist.ciCommand === 'npm run ci:release-candidate:local-dev' &&
        packageJson.scripts?.['release:github-actions-run-archive:check'] ===
          'tsx scripts/validate_release_github_actions_run_archive.ts',
      'checklist status, workflow, CI command, or package gate is not declared consistently',
    ),
    checkResult(
      'workflow archive summary JSON',
      'declared',
      checklist.runArchive.summaryJsonPath === 'tmp/release_candidate_github_actions_run_summary.json' &&
        workflowIncludes(workflow, [
          'Write GitHub Actions run archive summary',
          'tmp/release_candidate_github_actions_run_summary.json',
          'ConvertTo-Json -Depth 8',
          '[System.IO.File]::WriteAllText',
        ]),
      'workflow does not write the hosted run archive summary JSON',
    ),
    checkResult(
      'hosted run context fields',
      'declared',
      checklist.runArchive.runUrlExpression ===
        '${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}' &&
        requiredItemsPresent(checklist.runArchive.requiredGithubContext, [
          'GITHUB_RUN_ID',
          'GITHUB_RUN_ATTEMPT',
          'GITHUB_REPOSITORY',
          'GITHUB_REF_NAME',
          'GITHUB_SHA',
          'GITHUB_WORKFLOW',
        ]) &&
        workflowIncludes(workflow, [
          'RELEASE_CANDIDATE_RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}',
          'GITHUB_RUN_ID',
          'GITHUB_RUN_ATTEMPT',
          'GITHUB_REPOSITORY',
          'GITHUB_REF_NAME',
          'GITHUB_SHA',
          'GITHUB_WORKFLOW',
        ]),
      'workflow does not archive the required GitHub run context fields',
    ),
    checkResult(
      'artifact upload includes run archive',
      'declared',
      checklist.runArchive.artifactName === 'release-candidate-local-dev' &&
        checklist.runArchive.retentionDays === 14 &&
        requiredItemsPresent(checklist.archivedPaths, [
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
        ]) &&
        requiredItemsPresent(checklist.boundaryEvidencePaths, [
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
        ]) &&
        workflowIncludes(workflow, [
          'actions/upload-artifact@v4',
          'name: release-candidate-local-dev',
          'retention-days: 14',
          'tmp/release_candidate_github_actions_run_summary.json',
          'ops/release-artifacts/local-dev.gameplay-anchor-registry.json',
          'serviceLaunchBoundaryRegistry',
          'ops/release-artifacts/local-dev.service-launch-boundary-registry.json',
          'releaseBoundaryMandatoryArtifacts',
          'ops/release-artifacts/local-dev.release-boundary-mandatory-artifacts.json',
          'directBackendSpawnGuardIndex',
          'ops/release-artifacts/local-dev.direct-backend-spawn-guard-index.json',
          'releaseCandidateDryRunSnapshot',
          'ops/release-artifacts/local-dev.release-candidate-dry-run-snapshot.json',
          'soloLocalReleaseGateMatrix',
          'ops/release-artifacts/local-dev.solo-local-release-gate-matrix.json',
          'soloLocalStaticSuite',
          'ops/release-artifacts/local-dev.solo-local-static-suite.json',
          'releaseBoundaryArtifactCoverage',
          'ops/release-artifacts/local-dev.release-boundary-artifact-coverage.json',
          'releaseGithubActionsSummaryLocalReplay',
          'ops/release-artifacts/local-dev.release-github-actions-summary-local-replay.json',
          'releaseBoundaryHistoricalArtifactRetention',
          'ops/release-artifacts/local-dev.release-boundary-historical-artifact-retention.json',
          'releaseBoundaryHistoricalArtifactCleanupPolicy',
          'ops/release-artifacts/local-dev.release-boundary-historical-artifact-cleanup-policy.json',
        ]),
      'hosted run archive artifact upload is not declared consistently',
    ),
    checkResult(
      'failure classifier guidance',
      'declared',
      checklist.failureReasonClassifier.summaryJsonField === 'failureReasonClassifier' &&
        requiredItemsPresent(checklist.failureReasonClassifier.requiredCategories.map((item) => item.id), [
          'runnerProvisioning',
          'godotProvisioning',
          'godotExport',
          'gameplayAnchorRegistry',
          'releaseArtifactDrift',
          'opsRecovery',
          'artifactUpload',
          'unknown',
        ]) &&
        checklist.failureReasonClassifier.requiredCategories.every((item) => item.nextActionHint.trim().length > 0) &&
        workflowIncludes(workflow, [
          'failureReasonClassifier = [ordered]@{',
          'likelyFailureCategory',
          'nextActionHint',
          '#### Failure classifier',
        ]),
      'failure classifier guidance is not declared in the checklist and workflow',
    ),
    checkResult(
      'failure summary guidance',
      'declared',
      checklist.failureSummary.stepName === 'Summarize release candidate artifacts' &&
        checklist.failureSummary.statusEnv === 'RELEASE_CANDIDATE_JOB_STATUS' &&
        requiredItemsPresent(checklist.failureSummary.requiredFields, [
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
        ]) &&
        workflowIncludes(workflow, [
          'RELEASE_CANDIDATE_JOB_STATUS: ${{ job.status }}',
          'failureSummary',
          'boundaryEvidence',
          'gameplayAnchorRegistry',
          'failureReasonClassifier',
          'likelyFailureCategory',
          'currentHandoffPasteBlock',
          'triageOwner',
          '#### Failure summary',
        ]),
      'failure summary guidance is not declared in the checklist and workflow',
    ),
    checkResult(
      'anti-freeze release preflight summary',
      'declared',
      checklist.antiFreezeSummary.summaryHeading === 'Anti-freeze release preflight' &&
        checklist.antiFreezeSummary.serviceProcessGuard === 'npm.cmd run ops:service-process-guard' &&
        checklist.antiFreezeSummary.serviceLaunchBoundaryRegistry ===
          'ops/release-artifacts/local-dev.service-launch-boundary-registry.json' &&
        checklist.antiFreezeSummary.releaseDryRunStep1 === 'validate service launch boundary registry' &&
        checklist.antiFreezeSummary.releaseDryRunStep2 === 'validate direct backend spawn guard index' &&
        checklist.antiFreezeSummary.releaseDryRunStep3 === 'validate solo-local release gate matrix' &&
        checklist.antiFreezeSummary.releaseDryRunStep4 === 'validate release boundary mandatory artifacts' &&
        checklist.antiFreezeSummary.releaseDryRunStep5 === 'run Godot release export wrapper' &&
        checklist.antiFreezeSummary.duplicateLaunchAllowed === false &&
        checklist.antiFreezeSummary.hostedSummaryNonClaim ===
          'summary-only; does not start server:dev, tsx watch, Godot runtime, or smoke backend' &&
        workflowIncludes(workflow, [
          '#### Anti-freeze release preflight',
          'serviceProcessGuard',
          'serviceLaunchBoundaryRegistry',
          'releaseDryRunStep1',
          'releaseDryRunStep2',
          'releaseDryRunStep3',
          'releaseDryRunStep4',
          'releaseDryRunStep5',
          'validate solo-local release gate matrix',
          'validate direct backend spawn guard index',
          'duplicateLaunchAllowed',
          'hostedSummaryNonClaim',
        ]),
      'anti-freeze release preflight summary is not declared in the checklist and workflow',
    ),
    checkResult(
      'CURRENT handoff paste block guidance',
      'declared',
      checklist.currentHandoffPasteBlock.summaryJsonField === 'currentHandoffPasteBlock' &&
        checklist.currentHandoffPasteBlock.targetPath === 'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md' &&
        requiredItemsPresent(checklist.currentHandoffPasteBlock.requiredFields, [
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
        ]) &&
        workflowIncludes(workflow, [
          '$currentHandoffPasteBlock = [ordered]@{',
          'currentHandoffPasteBlock = $currentHandoffPasteBlock',
          '#### CURRENT handoff paste block',
          'tmp/release_candidate_github_actions_run_summary.json.currentHandoffPasteBlock',
        ]),
      'CURRENT handoff paste block guidance is not declared in the checklist and workflow',
    ),
    checkResult(
      'CURRENT handoff hosted run fields',
      'declared',
      checklist.currentHandoff.path === 'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md' &&
        requiredItemsPresent(checklist.currentHandoff.requiredHostedRunFields, [
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
        ]) &&
        workflowIncludes(currentHandoff, [
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
        ]),
      'CURRENT handoff does not record the hosted run archive fields',
    ),
  ]
}

export function validateReleaseGithubActionsRunArchive(
  options: ReleaseGithubActionsRunArchiveOptions,
): ReleaseGithubActionsRunArchiveResult {
  const profileId = normalizeProfileId(options.profileId)
  const checks = buildReleaseGithubActionsRunArchiveChecks({ profileId })
  const errors = checks
    .filter((check) => !check.ok)
    .map((check) => `${check.label}: ${check.detail ?? check.status}`)

  return {
    profileId,
    ok: errors.length === 0,
    checks,
    errors,
  }
}

function parseChecklistJson(doc: string, sourcePath: string): ReleaseGithubActionsRunArchiveChecklist {
  const match = doc.match(/```json\s*\n([\s\S]*?)\n```/)
  if (!match) {
    throw new Error(`GitHub Actions run archive checklist missing JSON block: ${sourcePath}`)
  }
  return JSON.parse(match[1]) as ReleaseGithubActionsRunArchiveChecklist
}

function checkResult(
  label: string,
  status: ReleaseGithubActionsRunArchiveCheckStatus,
  ok: boolean,
  detail: string,
): ReleaseGithubActionsRunArchiveCheck {
  return {
    label,
    ok,
    status: ok ? status : 'invalid',
    detail: ok ? undefined : detail,
  }
}

function workflowIncludes(source: string, tokens: string[]): boolean {
  return tokens.every((token) => source.includes(token))
}

function requiredItemsPresent(actual: string[], required: string[]): boolean {
  return required.every((item) => actual.includes(item))
}

function normalizeProfileId(profileId: string): string {
  const normalized = profileId.trim() || DEFAULT_RELEASE_GITHUB_ACTIONS_RUN_ARCHIVE_PROFILE
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`invalid release GitHub Actions run archive profile id: ${profileId}`)
  }
  return normalized
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try {
    const options = parseReleaseGithubActionsRunArchiveArgs(process.argv.slice(2))
    const result = validateReleaseGithubActionsRunArchive(options)
    if (!result.ok) {
      throw new Error(`release GitHub Actions run archive is invalid: ${result.errors.join('; ')}`)
    }
    console.log(`[release-github-actions-run-archive] ${result.profileId} ok`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
