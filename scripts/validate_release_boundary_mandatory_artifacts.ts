import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const DEFAULT_RELEASE_BOUNDARY_ARTIFACTS_PROFILE = 'local-dev'
export const DEFAULT_RELEASE_BOUNDARY_ARTIFACTS_PATH =
  'ops/release-artifacts/local-dev.release-boundary-mandatory-artifacts.json'

export type ReleaseBoundaryMandatoryArtifactsOptions = {
  profileId: string
}

export type ReleaseBoundaryMandatoryArtifact = {
  artifactId: string
  path: string
  owner: string
  releaseGate: string
  boundaryRole: string
}

export type ReleaseBoundaryMandatoryArtifactsChecklist = {
  status: string
  profileId: string
  releaseCandidateGateStep: string
  artifacts: ReleaseBoundaryMandatoryArtifact[]
  nonClaims: string[]
}

export type ReleaseBoundaryMandatoryArtifactsResult = {
  profileId: string
  ok: boolean
  errors: string[]
}

const REQUIRED_ARTIFACT_IDS = [
  'client_package_manifest',
  'server_release_artifact',
  'ai_subject_boundary',
  'ops_recovery_checklist',
  'gameplay_anchor_registry',
  'service_launch_registry',
  'direct_backend_spawn_guard_index',
  'release_candidate_dry_run_snapshot',
  'release_boundary_artifact_coverage',
  'release_boundary_historical_artifact_retention',
  'release_boundary_historical_artifact_cleanup_policy',
  'release_github_actions_summary_local_replay',
  'solo_local_release_gate_matrix',
  'solo_local_static_suite',
  'local_anchor_static_sweep',
  'github_actions_run_archive_contract',
  'boundary_convergence_progress',
  'tmp_evidence_retention',
] as const

const REQUIRED_NON_CLAIMS = [
  'no hosted GitHub Actions run evidence is claimed',
  'no staging/prod endpoint profile is invented',
  'no physical source movement is allowed',
  'no service is started by this checklist',
] as const

export function parseReleaseBoundaryMandatoryArtifactsArgs(
  argv: string[],
): ReleaseBoundaryMandatoryArtifactsOptions {
  let profileId = DEFAULT_RELEASE_BOUNDARY_ARTIFACTS_PROFILE
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
    throw new Error(`unknown release boundary mandatory artifacts argument: ${arg}`)
  }
  return { profileId: normalizeProfileId(profileId) }
}

export function releaseBoundaryMandatoryArtifactsPath(profileId: string): string {
  const normalized = normalizeProfileId(profileId)
  if (normalized === DEFAULT_RELEASE_BOUNDARY_ARTIFACTS_PROFILE) {
    return DEFAULT_RELEASE_BOUNDARY_ARTIFACTS_PATH
  }
  return `ops/release-artifacts/${normalized}.release-boundary-mandatory-artifacts.json`
}

export function validateReleaseBoundaryMandatoryArtifacts(
  options: ReleaseBoundaryMandatoryArtifactsOptions,
): ReleaseBoundaryMandatoryArtifactsResult {
  const profileId = normalizeProfileId(options.profileId)
  const checklistPath = releaseBoundaryMandatoryArtifactsPath(profileId)
  const errors: string[] = []

  if (!existsSync(checklistPath)) {
    return {
      profileId,
      ok: false,
      errors: [`release boundary mandatory artifacts checklist missing: ${checklistPath}`],
    }
  }

  const checklist = JSON.parse(readFileSync(checklistPath, 'utf8')) as ReleaseBoundaryMandatoryArtifactsChecklist
  if (checklist.status !== 'current Stage 838 release boundary mandatory artifact checklist') {
    errors.push('checklist status is not current Stage 838 release boundary mandatory artifact checklist')
  }
  if (checklist.profileId !== profileId) {
    errors.push(`checklist profileId mismatch: ${checklist.profileId}`)
  }
  if (checklist.releaseCandidateGateStep !== 'validate release boundary mandatory artifacts') {
    errors.push('release candidate gate step is not validate release boundary mandatory artifacts')
  }

  const artifactIds = checklist.artifacts.map((artifact) => artifact.artifactId)
  if (JSON.stringify(artifactIds) !== JSON.stringify(REQUIRED_ARTIFACT_IDS)) {
    errors.push(`mandatory artifact ids mismatch: ${artifactIds.join(', ')}`)
  }

  for (const artifact of checklist.artifacts) {
    if (!artifact.path.trim()) errors.push(`${artifact.artifactId} path is empty`)
    if (!artifact.owner.trim()) errors.push(`${artifact.artifactId} owner is empty`)
    if (!artifact.releaseGate.trim()) errors.push(`${artifact.artifactId} releaseGate is empty`)
    if (!artifact.boundaryRole.trim()) errors.push(`${artifact.artifactId} boundaryRole is empty`)
    if (artifact.path && !existsSync(artifact.path)) {
      errors.push(`${artifact.artifactId} path does not exist: ${artifact.path}`)
    }
  }

  for (const nonClaim of REQUIRED_NON_CLAIMS) {
    if (!checklist.nonClaims.includes(nonClaim)) {
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
  const normalized = profileId.trim() || DEFAULT_RELEASE_BOUNDARY_ARTIFACTS_PROFILE
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`invalid release boundary mandatory artifacts profile id: ${profileId}`)
  }
  return normalized
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try {
    const result = validateReleaseBoundaryMandatoryArtifacts(
      parseReleaseBoundaryMandatoryArtifactsArgs(process.argv.slice(2)),
    )
    if (!result.ok) {
      throw new Error(`release boundary mandatory artifacts invalid: ${result.errors.join('; ')}`)
    }
    console.log(`[release-boundary-artifacts] ${result.profileId} ok`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
