import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const DEFAULT_RELEASE_BOUNDARY_HISTORICAL_ARTIFACT_CLEANUP_POLICY_PROFILE = 'local-dev'
export const DEFAULT_RELEASE_BOUNDARY_HISTORICAL_ARTIFACT_CLEANUP_POLICY_PATH =
  'ops/release-artifacts/local-dev.release-boundary-historical-artifact-cleanup-policy.json'

type CleanupTargetArtifact = {
  path: string
  classification: string
  retentionManifestPath: string
  replacementPath: string
  requiredBeforeDeletion: string[]
}

type HistoricalArtifactCleanupPolicy = {
  status: string
  profileId: string
  policyId: string
  cleanupMode: string
  defaultAction: string
  deletionAllowed: boolean
  targetArtifacts: CleanupTargetArtifact[]
  requiredEvidence: string[]
  nonClaims: string[]
}

type RetentionManifest = {
  artifacts: Array<{
    path: string
    removalAllowed: boolean
  }>
}

export type ReleaseBoundaryHistoricalArtifactCleanupPolicyOptions = {
  profileId: string
}

export type ReleaseBoundaryHistoricalArtifactCleanupPolicyResult = {
  profileId: string
  ok: boolean
  errors: string[]
}

const HISTORICAL_ARTIFACT_PATH = 'ops/release-artifacts/local-dev.server-release-artifact.json'
const RETENTION_MANIFEST_PATH =
  'ops/release-artifacts/local-dev.release-boundary-historical-artifact-retention.json'
const GENERATED_REPLACEMENT_PATH = 'ops/release-artifacts/generated/local-dev.server-release-artifact.json'
const ARCHIVE_DOC_PATH = 'docs/RELEASE_CANDIDATE_GITHUB_ACTIONS_RUN_ARCHIVE_CURRENT_2026_06_16.md'
const REQUIRED_BEFORE_DELETION = [
  'hosted release candidate archive includes generated replacement',
  'Stage 844 retention manifest removalAllowed is true',
  'CURRENT handoff records deletion approval and evidence',
] as const
const REQUIRED_EVIDENCE = [RETENTION_MANIFEST_PATH, GENERATED_REPLACEMENT_PATH, ARCHIVE_DOC_PATH] as const
const REQUIRED_NON_CLAIMS = [
  'does not delete historical artifacts',
  'does not claim hosted archive evidence exists',
  'does not run release:candidate:local-dev',
  'does not start server:dev or tsx watch',
] as const

export function parseReleaseBoundaryHistoricalArtifactCleanupPolicyArgs(
  argv: string[],
): ReleaseBoundaryHistoricalArtifactCleanupPolicyOptions {
  let profileId = DEFAULT_RELEASE_BOUNDARY_HISTORICAL_ARTIFACT_CLEANUP_POLICY_PROFILE
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
    throw new Error(`unknown release boundary historical artifact cleanup policy argument: ${arg}`)
  }
  return { profileId: normalizeProfileId(profileId) }
}

export function releaseBoundaryHistoricalArtifactCleanupPolicyPath(profileId: string): string {
  const normalized = normalizeProfileId(profileId)
  if (normalized === DEFAULT_RELEASE_BOUNDARY_HISTORICAL_ARTIFACT_CLEANUP_POLICY_PROFILE) {
    return DEFAULT_RELEASE_BOUNDARY_HISTORICAL_ARTIFACT_CLEANUP_POLICY_PATH
  }
  return `ops/release-artifacts/${normalized}.release-boundary-historical-artifact-cleanup-policy.json`
}

export function validateReleaseBoundaryHistoricalArtifactCleanupPolicy(
  options: ReleaseBoundaryHistoricalArtifactCleanupPolicyOptions,
): ReleaseBoundaryHistoricalArtifactCleanupPolicyResult {
  const profileId = normalizeProfileId(options.profileId)
  const policyPath = releaseBoundaryHistoricalArtifactCleanupPolicyPath(profileId)
  const errors: string[] = []

  if (!existsSync(policyPath)) {
    return {
      profileId,
      ok: false,
      errors: [`release boundary historical artifact cleanup policy missing: ${policyPath}`],
    }
  }

  const policy = JSON.parse(readFileSync(policyPath, 'utf8')) as HistoricalArtifactCleanupPolicy
  if (policy.status !== 'current Stage 845 release boundary historical artifact cleanup policy') {
    errors.push('cleanup policy status is not current Stage 845 release boundary historical artifact cleanup policy')
  }
  if (policy.profileId !== profileId) {
    errors.push(`cleanup policy profileId mismatch: ${policy.profileId}`)
  }
  if (policy.policyId !== 'release-boundary-historical-artifact-cleanup-policy') {
    errors.push(`cleanup policy id mismatch: ${policy.policyId}`)
  }
  if (policy.cleanupMode !== 'dry-run-only') {
    errors.push(`cleanup policy cleanupMode must be dry-run-only, got: ${policy.cleanupMode}`)
  }
  if (policy.defaultAction !== 'retain') {
    errors.push(`cleanup policy defaultAction must be retain, got: ${policy.defaultAction}`)
  }
  if (policy.deletionAllowed !== false) {
    errors.push('cleanup policy deletionAllowed must be false')
  }

  const targetPaths = policy.targetArtifacts.map((artifact) => artifact.path)
  if (JSON.stringify(targetPaths) !== JSON.stringify([HISTORICAL_ARTIFACT_PATH])) {
    errors.push(`cleanup target path mismatch: ${targetPaths.join(', ')}`)
  }
  const target = policy.targetArtifacts[0]
  if (!target) {
    errors.push('cleanup policy target artifact is missing')
  } else {
    if (target.classification !== 'historical-reference') {
      errors.push(`cleanup target classification mismatch: ${target.classification}`)
    }
    if (target.retentionManifestPath !== RETENTION_MANIFEST_PATH) {
      errors.push(`cleanup target retentionManifestPath mismatch: ${target.retentionManifestPath}`)
    }
    if (target.replacementPath !== GENERATED_REPLACEMENT_PATH) {
      errors.push(`cleanup target replacementPath mismatch: ${target.replacementPath}`)
    }
    for (const prerequisite of REQUIRED_BEFORE_DELETION) {
      if (!target.requiredBeforeDeletion.includes(prerequisite)) {
        errors.push(`missing requiredBeforeDeletion prerequisite: ${prerequisite}`)
      }
    }
    for (const path of [target.path, target.retentionManifestPath, target.replacementPath]) {
      if (!existsSync(path)) {
        errors.push(`cleanup target evidence path does not exist: ${path}`)
      }
    }
  }

  for (const evidence of REQUIRED_EVIDENCE) {
    if (!policy.requiredEvidence.includes(evidence)) {
      errors.push(`missing required evidence: ${evidence}`)
    }
    if (!existsSync(evidence)) {
      errors.push(`required evidence path does not exist: ${evidence}`)
    }
  }
  for (const nonClaim of REQUIRED_NON_CLAIMS) {
    if (!policy.nonClaims.includes(nonClaim)) {
      errors.push(`missing non-claim: ${nonClaim}`)
    }
  }

  if (existsSync(RETENTION_MANIFEST_PATH)) {
    const retention = JSON.parse(readFileSync(RETENTION_MANIFEST_PATH, 'utf8')) as RetentionManifest
    const retained = retention.artifacts.find((artifact) => artifact.path === HISTORICAL_ARTIFACT_PATH)
    if (!retained) {
      errors.push('Stage 844 retention manifest does not include the historical artifact')
    } else if (retained.removalAllowed !== false) {
      errors.push('Stage 844 retention manifest must still keep removalAllowed false')
    }
  }

  return {
    profileId,
    ok: errors.length === 0,
    errors,
  }
}

function normalizeProfileId(profileId: string): string {
  const normalized = profileId.trim() || DEFAULT_RELEASE_BOUNDARY_HISTORICAL_ARTIFACT_CLEANUP_POLICY_PROFILE
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`invalid release boundary historical artifact cleanup policy profile id: ${profileId}`)
  }
  return normalized
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try {
    const result = validateReleaseBoundaryHistoricalArtifactCleanupPolicy(
      parseReleaseBoundaryHistoricalArtifactCleanupPolicyArgs(process.argv.slice(2)),
    )
    if (!result.ok) {
      throw new Error(`release boundary historical artifact cleanup policy invalid: ${result.errors.join('; ')}`)
    }
    console.log(`[release-boundary-historical-artifact-cleanup-policy] ${result.profileId} ok`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
