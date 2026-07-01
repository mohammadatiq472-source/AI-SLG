import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const DEFAULT_RELEASE_GITHUB_ACTIONS_SUMMARY_LOCAL_REPLAY_PROFILE = 'local-dev'
export const DEFAULT_RELEASE_GITHUB_ACTIONS_SUMMARY_LOCAL_REPLAY_PATH =
  'ops/release-artifacts/local-dev.release-github-actions-summary-local-replay.json'

type FailureReasonClassifier = {
  likelyFailureCategory: string
  nextActionHint: string
  requiredCategories: string[]
}

type FixtureSummary = {
  runUrl: string
  runId: string
  runAttempt: string
  jobStatus: string
  artifactName: string
  summaryJsonPath: string
  boundaryEvidence: Record<string, string>
  failureReasonClassifier: FailureReasonClassifier
  currentHandoffPasteBlock: Record<string, unknown>
}

type SummaryLocalReplay = {
  status: string
  profileId: string
  replayMode: string
  sourceWorkflow: string
  summaryJsonPath: string
  fixtureSummary: FixtureSummary
  requiredArchiveDocFields: string[]
  nonClaims: string[]
}

export type ReleaseGithubActionsSummaryLocalReplayOptions = {
  profileId: string
}

export type ReleaseGithubActionsSummaryLocalReplayResult = {
  profileId: string
  ok: boolean
  errors: string[]
}

const SOURCE_WORKFLOW = '.github/workflows/release-candidate-boundary-gate.yml'
const SUMMARY_JSON_PATH = 'tmp/release_candidate_github_actions_run_summary.json'
const REQUIRED_BOUNDARY_EVIDENCE = {
  boundaryConvergenceProgress: 'ops/release-artifacts/local-dev.boundary-convergence-progress.json',
  releaseBoundaryMandatoryArtifacts: 'ops/release-artifacts/local-dev.release-boundary-mandatory-artifacts.json',
  releaseBoundaryArtifactCoverage: 'ops/release-artifacts/local-dev.release-boundary-artifact-coverage.json',
  releaseGithubActionsSummaryLocalReplay:
    'ops/release-artifacts/local-dev.release-github-actions-summary-local-replay.json',
  soloLocalReleaseGateMatrix: 'ops/release-artifacts/local-dev.solo-local-release-gate-matrix.json',
  soloLocalStaticSuite: 'ops/release-artifacts/local-dev.solo-local-static-suite.json',
  releaseBoundaryHistoricalArtifactRetention:
    'ops/release-artifacts/local-dev.release-boundary-historical-artifact-retention.json',
  releaseBoundaryHistoricalArtifactCleanupPolicy:
    'ops/release-artifacts/local-dev.release-boundary-historical-artifact-cleanup-policy.json',
} as const
const REQUIRED_CATEGORIES = [
  'runnerProvisioning',
  'godotProvisioning',
  'godotExport',
  'gameplayAnchorRegistry',
  'releaseArtifactDrift',
  'opsRecovery',
  'artifactUpload',
  'unknown',
] as const
const REQUIRED_ARCHIVE_DOC_FIELDS = [
  'runUrl',
  'runId',
  'runAttempt',
  'jobStatus',
  'artifactName',
  'summaryJsonPath',
  'boundaryEvidence',
  'failureReasonClassifier',
  'currentHandoffPasteBlock',
] as const
const REQUIRED_NON_CLAIMS = [
  'does not claim hosted GitHub Actions run evidence',
  'does not run release:candidate:local-dev',
  'does not start server:dev or tsx watch',
] as const

export function parseReleaseGithubActionsSummaryLocalReplayArgs(
  argv: string[],
): ReleaseGithubActionsSummaryLocalReplayOptions {
  let profileId = DEFAULT_RELEASE_GITHUB_ACTIONS_SUMMARY_LOCAL_REPLAY_PROFILE
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
    throw new Error(`unknown release GitHub Actions summary local replay argument: ${arg}`)
  }
  return { profileId: normalizeProfileId(profileId) }
}

export function releaseGithubActionsSummaryLocalReplayPath(profileId: string): string {
  const normalized = normalizeProfileId(profileId)
  if (normalized === DEFAULT_RELEASE_GITHUB_ACTIONS_SUMMARY_LOCAL_REPLAY_PROFILE) {
    return DEFAULT_RELEASE_GITHUB_ACTIONS_SUMMARY_LOCAL_REPLAY_PATH
  }
  return `ops/release-artifacts/${normalized}.release-github-actions-summary-local-replay.json`
}

export function validateReleaseGithubActionsSummaryLocalReplay(
  options: ReleaseGithubActionsSummaryLocalReplayOptions,
): ReleaseGithubActionsSummaryLocalReplayResult {
  const profileId = normalizeProfileId(options.profileId)
  const replayPath = releaseGithubActionsSummaryLocalReplayPath(profileId)
  const errors: string[] = []

  if (!existsSync(replayPath)) {
    return {
      profileId,
      ok: false,
      errors: [`release GitHub Actions summary local replay missing: ${replayPath}`],
    }
  }

  const replay = JSON.parse(readFileSync(replayPath, 'utf8')) as SummaryLocalReplay
  if (replay.status !== 'current Stage 846 release GitHub Actions summary local replay') {
    errors.push('summary local replay status is not current Stage 846 release GitHub Actions summary local replay')
  }
  if (replay.profileId !== profileId) errors.push(`summary local replay profileId mismatch: ${replay.profileId}`)
  if (replay.replayMode !== 'local-fixture-only') errors.push(`replayMode mismatch: ${replay.replayMode}`)
  if (replay.sourceWorkflow !== SOURCE_WORKFLOW) errors.push(`sourceWorkflow mismatch: ${replay.sourceWorkflow}`)
  if (replay.summaryJsonPath !== SUMMARY_JSON_PATH) errors.push(`summaryJsonPath mismatch: ${replay.summaryJsonPath}`)

  const workflow = readFileSync(SOURCE_WORKFLOW, 'utf8')
  for (const token of [
    SUMMARY_JSON_PATH,
    '$currentHandoffPasteBlock = [ordered]@{',
    'failureReasonClassifier = $failureReasonClassifier',
    'currentHandoffPasteBlock = $currentHandoffPasteBlock',
  ]) {
    if (!workflow.includes(token)) {
      errors.push(`source workflow missing summary token: ${token}`)
    }
  }

  const summary = replay.fixtureSummary
  if (summary.runUrl !== 'local-fixture-no-hosted-run') errors.push('fixture runUrl must stay local-fixture-no-hosted-run')
  if (summary.runId !== 'local-fixture') errors.push('fixture runId must stay local-fixture')
  if (summary.runAttempt !== '0') errors.push('fixture runAttempt must be 0')
  if (summary.jobStatus !== 'summary-fixture') errors.push('fixture jobStatus must be summary-fixture')
  if (summary.artifactName !== 'release-candidate-local-dev') errors.push('fixture artifactName mismatch')
  if (summary.summaryJsonPath !== SUMMARY_JSON_PATH) errors.push('fixture summaryJsonPath mismatch')

  for (const [key, path] of Object.entries(REQUIRED_BOUNDARY_EVIDENCE)) {
    if (summary.boundaryEvidence[key] !== path) {
      errors.push(`missing boundary evidence ${key}: ${path}`)
    }
    if (!existsSync(path)) {
      errors.push(`boundary evidence path does not exist: ${path}`)
    }
  }

  validateClassifier(summary.failureReasonClassifier, errors, 'fixture failureReasonClassifier')
  const pasteBlock = summary.currentHandoffPasteBlock
  for (const field of REQUIRED_ARCHIVE_DOC_FIELDS) {
    if (!replay.requiredArchiveDocFields.includes(field)) {
      errors.push(`missing required archive doc field: ${field}`)
    }
    if (!(field in pasteBlock)) {
      errors.push(`currentHandoffPasteBlock missing field: ${field}`)
    }
  }

  for (const nonClaim of REQUIRED_NON_CLAIMS) {
    if (!replay.nonClaims.includes(nonClaim)) {
      errors.push(`missing non-claim: ${nonClaim}`)
    }
  }

  return {
    profileId,
    ok: errors.length === 0,
    errors,
  }
}

function validateClassifier(classifier: FailureReasonClassifier, errors: string[], label: string): void {
  if (classifier.likelyFailureCategory !== 'unknown') {
    errors.push(`${label} likelyFailureCategory must be unknown`)
  }
  if (
    classifier.nextActionHint !==
    'Use failureReasonClassifier with the failed workflow step name and start from the matching nextActionHint.'
  ) {
    errors.push(`${label} nextActionHint mismatch`)
  }
  const actual = classifier.requiredCategories
  if (JSON.stringify(actual) !== JSON.stringify([...REQUIRED_CATEGORIES])) {
    errors.push(`${label} categories mismatch: ${actual.join(', ')}`)
  }
}

function normalizeProfileId(profileId: string): string {
  const normalized = profileId.trim() || DEFAULT_RELEASE_GITHUB_ACTIONS_SUMMARY_LOCAL_REPLAY_PROFILE
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`invalid release GitHub Actions summary local replay profile id: ${profileId}`)
  }
  return normalized
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try {
    const result = validateReleaseGithubActionsSummaryLocalReplay(
      parseReleaseGithubActionsSummaryLocalReplayArgs(process.argv.slice(2)),
    )
    if (!result.ok) {
      throw new Error(`release GitHub Actions summary local replay invalid: ${result.errors.join('; ')}`)
    }
    console.log(`[release-github-actions-summary-local-replay] ${result.profileId} ok`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
