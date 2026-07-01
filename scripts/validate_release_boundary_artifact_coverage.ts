import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const DEFAULT_RELEASE_BOUNDARY_ARTIFACT_COVERAGE_PROFILE = 'local-dev'
export const DEFAULT_RELEASE_BOUNDARY_ARTIFACT_COVERAGE_PATH =
  'ops/release-artifacts/local-dev.release-boundary-artifact-coverage.json'

type ReleaseBoundaryArtifactCoverageEntry = {
  path: string
  mandatoryChecklistRequired: boolean
  githubArchiveRequired: boolean
  stage826Required: boolean
  rationale: string
}

type ReleaseBoundaryArtifactCoverage = {
  status: string
  profileId: string
  scannedDirectory: string
  coverageRule: string
  artifacts: ReleaseBoundaryArtifactCoverageEntry[]
  nonClaims: string[]
}

export type ReleaseBoundaryArtifactCoverageOptions = {
  profileId: string
}

export type ReleaseBoundaryArtifactCoverageResult = {
  profileId: string
  ok: boolean
  errors: string[]
}

const SCANNED_DIRECTORY = 'ops/release-artifacts'
const COVERAGE_RULE =
  'every top-level local-dev release-boundary artifact must declare mandatory checklist, GitHub archive, and Stage 826 coverage intent'
const REQUIRED_NON_CLAIMS = [
  'does not run release:candidate:local-dev',
  'does not start server:dev or tsx watch',
  'does not delete tmp evidence',
] as const

export function parseReleaseBoundaryArtifactCoverageArgs(
  argv: string[],
): ReleaseBoundaryArtifactCoverageOptions {
  let profileId = DEFAULT_RELEASE_BOUNDARY_ARTIFACT_COVERAGE_PROFILE
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
    throw new Error(`unknown release boundary artifact coverage argument: ${arg}`)
  }
  return { profileId: normalizeProfileId(profileId) }
}

export function releaseBoundaryArtifactCoveragePath(profileId: string): string {
  const normalized = normalizeProfileId(profileId)
  if (normalized === DEFAULT_RELEASE_BOUNDARY_ARTIFACT_COVERAGE_PROFILE) {
    return DEFAULT_RELEASE_BOUNDARY_ARTIFACT_COVERAGE_PATH
  }
  return `ops/release-artifacts/${normalized}.release-boundary-artifact-coverage.json`
}

export function validateReleaseBoundaryArtifactCoverage(
  options: ReleaseBoundaryArtifactCoverageOptions,
): ReleaseBoundaryArtifactCoverageResult {
  const profileId = normalizeProfileId(options.profileId)
  const coveragePath = releaseBoundaryArtifactCoveragePath(profileId)
  const errors: string[] = []

  if (!existsSync(coveragePath)) {
    return {
      profileId,
      ok: false,
      errors: [`release boundary artifact coverage manifest missing: ${coveragePath}`],
    }
  }

  const coverage = JSON.parse(readFileSync(coveragePath, 'utf8')) as ReleaseBoundaryArtifactCoverage
  if (coverage.status !== 'current Stage 843 release boundary artifact coverage') {
    errors.push('coverage status is not current Stage 843 release boundary artifact coverage')
  }
  if (coverage.profileId !== profileId) {
    errors.push(`coverage profileId mismatch: ${coverage.profileId}`)
  }
  if (coverage.scannedDirectory !== SCANNED_DIRECTORY) {
    errors.push(`coverage scannedDirectory mismatch: ${coverage.scannedDirectory}`)
  }
  if (coverage.coverageRule !== COVERAGE_RULE) {
    errors.push('coverage rule mismatch')
  }

  const expectedPaths = readdirSync(SCANNED_DIRECTORY)
    .filter((name) => name.startsWith(`${profileId}.`) && name.endsWith('.json'))
    .map((name) => `${SCANNED_DIRECTORY}/${name}`)
    .sort()
  const actualPaths = coverage.artifacts.map((artifact) => artifact.path).sort()
  if (JSON.stringify(actualPaths) !== JSON.stringify(expectedPaths)) {
    errors.push(`coverage path mismatch: ${actualPaths.join(', ')}`)
  }

  const mandatoryChecklist = readFileSync(
    'ops/release-artifacts/local-dev.release-boundary-mandatory-artifacts.json',
    'utf8',
  )
  const archiveDoc = readFileSync('docs/RELEASE_CANDIDATE_GITHUB_ACTIONS_RUN_ARCHIVE_CURRENT_2026_06_16.md', 'utf8')
  const stage826 = readFileSync('ops/release-artifacts/local-dev.boundary-convergence-progress.json', 'utf8')

  for (const artifact of coverage.artifacts) {
    if (!existsSync(artifact.path)) {
      errors.push(`covered artifact path does not exist: ${artifact.path}`)
    }
    if (!artifact.rationale.trim()) {
      errors.push(`${artifact.path} rationale is empty`)
    }
    if (artifact.mandatoryChecklistRequired && !mandatoryChecklist.includes(artifact.path)) {
      errors.push(`${artifact.path} is marked mandatoryChecklistRequired but is absent from mandatory checklist`)
    }
    if (artifact.githubArchiveRequired && !archiveDoc.includes(artifact.path)) {
      errors.push(`${artifact.path} is marked githubArchiveRequired but is absent from GitHub archive doc`)
    }
    if (artifact.stage826Required && !stage826.includes(artifact.path)) {
      errors.push(`${artifact.path} is marked stage826Required but is absent from Stage 826 manifest`)
    }
  }

  for (const nonClaim of REQUIRED_NON_CLAIMS) {
    if (!coverage.nonClaims.includes(nonClaim)) {
      errors.push(`missing non-claim: ${nonClaim}`)
    }
  }

  return {
    profileId,
    ok: errors.length === 0,
    errors,
  }
}

function normalizeProfileId(profileId: string): string {
  const normalized = profileId.trim() || DEFAULT_RELEASE_BOUNDARY_ARTIFACT_COVERAGE_PROFILE
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`invalid release boundary artifact coverage profile id: ${profileId}`)
  }
  return normalized
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try {
    const result = validateReleaseBoundaryArtifactCoverage(
      parseReleaseBoundaryArtifactCoverageArgs(process.argv.slice(2)),
    )
    if (!result.ok) {
      throw new Error(`release boundary artifact coverage invalid: ${result.errors.join('; ')}`)
    }
    console.log(`[release-boundary-artifact-coverage] ${result.profileId} ok`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
