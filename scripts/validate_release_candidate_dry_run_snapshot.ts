import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { buildReleaseCandidateGateSteps } from './run_release_candidate_gate'

export const DEFAULT_RELEASE_CANDIDATE_DRY_RUN_SNAPSHOT_PROFILE = 'local-dev'
export const DEFAULT_RELEASE_CANDIDATE_DRY_RUN_SNAPSHOT_PATH =
  'ops/release-artifacts/local-dev.release-candidate-dry-run-snapshot.json'

export type ReleaseCandidateDryRunSnapshotOptions = {
  profileId: string
}

type ReleaseCandidateDryRunSnapshot = {
  status: string
  profileId: string
  dryRunCommand: string
  nonStarting: boolean
  steps: Array<{
    index: number
    name: string
    args: string[]
  }>
  nonClaims: string[]
}

export type ReleaseCandidateDryRunSnapshotResult = {
  profileId: string
  ok: boolean
  errors: string[]
}

const REQUIRED_NON_CLAIMS = [
  'does not run release:candidate:local-dev',
  'does not run Godot export',
  'does not start server:dev or tsx watch',
] as const

export function parseReleaseCandidateDryRunSnapshotArgs(
  argv: string[],
): ReleaseCandidateDryRunSnapshotOptions {
  let profileId = DEFAULT_RELEASE_CANDIDATE_DRY_RUN_SNAPSHOT_PROFILE
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
    throw new Error(`unknown release candidate dry-run snapshot argument: ${arg}`)
  }
  return { profileId: normalizeProfileId(profileId) }
}

export function releaseCandidateDryRunSnapshotPath(profileId: string): string {
  const normalized = normalizeProfileId(profileId)
  if (normalized === DEFAULT_RELEASE_CANDIDATE_DRY_RUN_SNAPSHOT_PROFILE) {
    return DEFAULT_RELEASE_CANDIDATE_DRY_RUN_SNAPSHOT_PATH
  }
  return `ops/release-artifacts/${normalized}.release-candidate-dry-run-snapshot.json`
}

export function validateReleaseCandidateDryRunSnapshot(
  options: ReleaseCandidateDryRunSnapshotOptions,
): ReleaseCandidateDryRunSnapshotResult {
  const profileId = normalizeProfileId(options.profileId)
  const snapshotPath = releaseCandidateDryRunSnapshotPath(profileId)
  const errors: string[] = []

  if (!existsSync(snapshotPath)) {
    return {
      profileId,
      ok: false,
      errors: [`release candidate dry-run snapshot missing: ${snapshotPath}`],
    }
  }

  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as ReleaseCandidateDryRunSnapshot
  if (snapshot.status !== 'current Stage 842 release candidate dry-run snapshot') {
    errors.push('snapshot status is not current Stage 842 release candidate dry-run snapshot')
  }
  if (snapshot.profileId !== profileId) {
    errors.push(`snapshot profileId mismatch: ${snapshot.profileId}`)
  }
  if (snapshot.dryRunCommand !== `npm.cmd run release:candidate -- --profile ${profileId} --dry-run`) {
    errors.push('snapshot dryRunCommand mismatch')
  }
  if (snapshot.nonStarting !== true) {
    errors.push('snapshot nonStarting must be true')
  }

  const expectedSteps = buildReleaseCandidateGateSteps(profileId).map((step, index) => ({
    index: index + 1,
    name: step.name,
    args: step.args,
  }))
  if (JSON.stringify(snapshot.steps) !== JSON.stringify(expectedSteps)) {
    errors.push('release candidate dry-run snapshot drift: steps do not match buildReleaseCandidateGateSteps')
  }

  for (const nonClaim of REQUIRED_NON_CLAIMS) {
    if (!snapshot.nonClaims.includes(nonClaim)) {
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
  const normalized = profileId.trim() || DEFAULT_RELEASE_CANDIDATE_DRY_RUN_SNAPSHOT_PROFILE
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`invalid release candidate dry-run snapshot profile id: ${profileId}`)
  }
  return normalized
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try {
    const result = validateReleaseCandidateDryRunSnapshot(
      parseReleaseCandidateDryRunSnapshotArgs(process.argv.slice(2)),
    )
    if (!result.ok) {
      throw new Error(`release candidate dry-run snapshot invalid: ${result.errors.join('; ')}`)
    }
    console.log(`[release-candidate-dry-run-snapshot] ${result.profileId} ok`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
