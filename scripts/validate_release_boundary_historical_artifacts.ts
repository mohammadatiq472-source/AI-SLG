import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const DEFAULT_RELEASE_BOUNDARY_HISTORICAL_ARTIFACTS_PROFILE = 'local-dev'
export const DEFAULT_RELEASE_BOUNDARY_HISTORICAL_ARTIFACTS_PATH =
  'ops/release-artifacts/local-dev.release-boundary-historical-artifact-retention.json'

type HistoricalArtifact = {
  path: string
  classification: string
  replacementPath: string
  keepUntil: string
  removalAllowed: boolean
  removalPrerequisites: string[]
  rationale: string
}

type HistoricalArtifactRetentionManifest = {
  status: string
  profileId: string
  artifacts: HistoricalArtifact[]
  nonClaims: string[]
}

export type ReleaseBoundaryHistoricalArtifactsOptions = {
  profileId: string
}

export type ReleaseBoundaryHistoricalArtifactsResult = {
  profileId: string
  ok: boolean
  errors: string[]
}

const HISTORICAL_ARTIFACT_PATH = 'ops/release-artifacts/local-dev.server-release-artifact.json'
const GENERATED_REPLACEMENT_PATH = 'ops/release-artifacts/generated/local-dev.server-release-artifact.json'
const KEEP_UNTIL = 'after hosted release candidate archive proves generated replacement is retained'
const REQUIRED_PREREQUISITES = [
  'generated replacement exists',
  'coverage manifest records historical-reference rationale',
  'CURRENT handoff records removal is not performed',
] as const
const REQUIRED_NON_CLAIMS = [
  'does not delete historical artifacts',
  'does not run release:candidate:local-dev',
  'does not start server:dev or tsx watch',
] as const

export function parseReleaseBoundaryHistoricalArtifactsArgs(
  argv: string[],
): ReleaseBoundaryHistoricalArtifactsOptions {
  let profileId = DEFAULT_RELEASE_BOUNDARY_HISTORICAL_ARTIFACTS_PROFILE
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
    throw new Error(`unknown release boundary historical artifacts argument: ${arg}`)
  }
  return { profileId: normalizeProfileId(profileId) }
}

export function releaseBoundaryHistoricalArtifactsPath(profileId: string): string {
  const normalized = normalizeProfileId(profileId)
  if (normalized === DEFAULT_RELEASE_BOUNDARY_HISTORICAL_ARTIFACTS_PROFILE) {
    return DEFAULT_RELEASE_BOUNDARY_HISTORICAL_ARTIFACTS_PATH
  }
  return `ops/release-artifacts/${normalized}.release-boundary-historical-artifact-retention.json`
}

export function validateReleaseBoundaryHistoricalArtifacts(
  options: ReleaseBoundaryHistoricalArtifactsOptions,
): ReleaseBoundaryHistoricalArtifactsResult {
  const profileId = normalizeProfileId(options.profileId)
  const retentionPath = releaseBoundaryHistoricalArtifactsPath(profileId)
  const errors: string[] = []

  if (!existsSync(retentionPath)) {
    return {
      profileId,
      ok: false,
      errors: [`release boundary historical artifact retention manifest missing: ${retentionPath}`],
    }
  }

  const retention = JSON.parse(readFileSync(retentionPath, 'utf8')) as HistoricalArtifactRetentionManifest
  if (retention.status !== 'current Stage 844 release boundary historical artifact retention') {
    errors.push('retention status is not current Stage 844 release boundary historical artifact retention')
  }
  if (retention.profileId !== profileId) {
    errors.push(`retention profileId mismatch: ${retention.profileId}`)
  }

  const artifactPaths = retention.artifacts.map((artifact) => artifact.path)
  if (JSON.stringify(artifactPaths) !== JSON.stringify([HISTORICAL_ARTIFACT_PATH])) {
    errors.push(`historical artifact path mismatch: ${artifactPaths.join(', ')}`)
  }

  const historical = retention.artifacts[0]
  if (!historical) {
    errors.push('historical artifact entry is missing')
  } else {
    if (historical.classification !== 'historical-reference') {
      errors.push(`historical artifact classification mismatch: ${historical.classification}`)
    }
    if (historical.replacementPath !== GENERATED_REPLACEMENT_PATH) {
      errors.push(`historical artifact replacementPath mismatch: ${historical.replacementPath}`)
    }
    if (historical.keepUntil !== KEEP_UNTIL) {
      errors.push(`historical artifact keepUntil mismatch: ${historical.keepUntil}`)
    }
    if (historical.removalAllowed !== false) {
      errors.push('historical artifact removalAllowed must be false')
    }
    if (!historical.rationale.trim()) {
      errors.push('historical artifact rationale is empty')
    }
    if (!existsSync(historical.path)) {
      errors.push(`historical artifact path does not exist: ${historical.path}`)
    }
    if (!existsSync(historical.replacementPath)) {
      errors.push(`historical artifact replacement path does not exist: ${historical.replacementPath}`)
    }
    for (const prerequisite of REQUIRED_PREREQUISITES) {
      if (!historical.removalPrerequisites.includes(prerequisite)) {
        errors.push(`missing removal prerequisite: ${prerequisite}`)
      }
    }
  }

  const coverage = readFileSync('ops/release-artifacts/local-dev.release-boundary-artifact-coverage.json', 'utf8')
  if (!coverage.includes(HISTORICAL_ARTIFACT_PATH)) {
    errors.push('coverage manifest does not include historical artifact path')
  }
  if (!coverage.includes('historical top-level server artifact reference')) {
    errors.push('coverage manifest does not record historical-reference rationale')
  }

  for (const nonClaim of REQUIRED_NON_CLAIMS) {
    if (!retention.nonClaims.includes(nonClaim)) {
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
  const normalized = profileId.trim() || DEFAULT_RELEASE_BOUNDARY_HISTORICAL_ARTIFACTS_PROFILE
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`invalid release boundary historical artifacts profile id: ${profileId}`)
  }
  return normalized
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try {
    const result = validateReleaseBoundaryHistoricalArtifacts(
      parseReleaseBoundaryHistoricalArtifactsArgs(process.argv.slice(2)),
    )
    if (!result.ok) {
      throw new Error(`release boundary historical artifacts invalid: ${result.errors.join('; ')}`)
    }
    console.log(`[release-boundary-historical-artifacts] ${result.profileId} ok`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
