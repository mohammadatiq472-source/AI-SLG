import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { buildReleaseCandidateGateSteps } from './run_release_candidate_gate'

export const DEFAULT_RELEASE_SOLO_LOCAL_GATE_MATRIX_PROFILE = 'local-dev'
export const DEFAULT_RELEASE_SOLO_LOCAL_GATE_MATRIX_PATH =
  'ops/release-artifacts/local-dev.solo-local-release-gate-matrix.json'

type SoloLocalGate = {
  gateId: string
  command: string
  startsService: boolean
  requiresHostedEvidence: boolean
  requiresStagingProdEndpoint: boolean
  reason: string
}

type DeferredExternalGate = {
  stageId: number
  gateId: string
  status: string
  unblockRequires: string
}

type SoloLocalReleaseGateMatrix = {
  status: string
  profileId: string
  laneMode: string
  currentDecision: {
    hostedCiRequiredNow: boolean
    localReplayIsHostedEvidence: boolean
    stagingProdRequiredNow: boolean
    physicalSplitAllowed: boolean
  }
  formalLocalGates: SoloLocalGate[]
  deferredExternalGates: DeferredExternalGate[]
  nonClaims: string[]
}

export type ReleaseSoloLocalGateMatrixOptions = {
  profileId: string
}

export type ReleaseSoloLocalGateMatrixResult = {
  profileId: string
  ok: boolean
  errors: string[]
}

const EXPECTED_LOCAL_GATES: SoloLocalGate[] = [
  {
    gateId: 'service_process_guard',
    command: 'npm.cmd run ops:service-process-guard',
    startsService: false,
    requiresHostedEvidence: false,
    requiresStagingProdEndpoint: false,
    reason: 'proves no duplicate local dev/watch/server process is already running before any local lane continues',
  },
  {
    gateId: 'release_candidate_dry_run_snapshot',
    command: 'npm.cmd run release:candidate:dry-run-snapshot:check -- --profile local-dev',
    startsService: false,
    requiresHostedEvidence: false,
    requiresStagingProdEndpoint: false,
    reason: 'proves the local release candidate step order without running export, backend, or hosted CI',
  },
  {
    gateId: 'release_boundary_mandatory_artifacts',
    command: 'npm.cmd run release:boundary-artifacts:check -- --profile local-dev',
    startsService: false,
    requiresHostedEvidence: false,
    requiresStagingProdEndpoint: false,
    reason: 'proves mandatory local-dev release artifacts are declared without claiming external evidence',
  },
  {
    gateId: 'release_boundary_artifact_coverage',
    command: 'npm.cmd run release:boundary-artifact-coverage:check -- --profile local-dev',
    startsService: false,
    requiresHostedEvidence: false,
    requiresStagingProdEndpoint: false,
    reason: 'proves top-level release-boundary artifacts are classified before local progress claims',
  },
  {
    gateId: 'release_github_actions_summary_local_replay',
    command: 'npm.cmd run release:github-actions-summary-local-replay:check -- --profile local-dev',
    startsService: false,
    requiresHostedEvidence: false,
    requiresStagingProdEndpoint: false,
    reason: 'proves hosted summary JSON shape through a local fixture while explicitly not accepting hosted evidence',
  },
  {
    gateId: 'github_actions_run_archive_static_contract',
    command: 'npm.cmd run release:github-actions-run-archive:check -- --profile local-dev',
    startsService: false,
    requiresHostedEvidence: false,
    requiresStagingProdEndpoint: false,
    reason: 'proves the archive contract fields exist before a future real hosted run is accepted',
  },
] as const

const EXPECTED_DEFERRED_EXTERNAL_GATES: DeferredExternalGate[] = [
  {
    stageId: 823,
    gateId: 'hosted_github_actions_run_archive',
    status: 'deferred_for_solo_local_until_real_hosted_run_needed',
    unblockRequires: 'real hosted GitHub Actions run URL, id, attempt, status, artifact, summary JSON, and logs',
  },
  {
    stageId: 824,
    gateId: 'staging_prod_endpoint_profiles',
    status: 'blocked_until_real_public_endpoints',
    unblockRequires: 'real public staging/prod endpoint values supplied by deployment evidence',
  },
  {
    stageId: 825,
    gateId: 'physical_split_readiness',
    status: 'blocked_until_stage_823_824_intentionally_green',
    unblockRequires: 'hosted run archive evidence and real staging/prod profiles/artifacts both intentionally green',
  },
] as const

const REQUIRED_NON_CLAIMS = [
  'does not claim hosted GitHub Actions run evidence',
  'does not treat Stage 846 local replay as hosted evidence',
  'does not invent staging/prod endpoints',
  'does not start server:dev or tsx watch',
] as const

export function parseReleaseSoloLocalGateMatrixArgs(argv: string[]): ReleaseSoloLocalGateMatrixOptions {
  let profileId = DEFAULT_RELEASE_SOLO_LOCAL_GATE_MATRIX_PROFILE
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
    throw new Error(`unknown release solo/local gate matrix argument: ${arg}`)
  }
  return { profileId: normalizeProfileId(profileId) }
}

export function releaseSoloLocalGateMatrixPath(profileId: string): string {
  const normalized = normalizeProfileId(profileId)
  if (normalized === DEFAULT_RELEASE_SOLO_LOCAL_GATE_MATRIX_PROFILE) {
    return DEFAULT_RELEASE_SOLO_LOCAL_GATE_MATRIX_PATH
  }
  return `ops/release-artifacts/${normalized}.solo-local-release-gate-matrix.json`
}

export function validateReleaseSoloLocalGateMatrix(
  options: ReleaseSoloLocalGateMatrixOptions,
): ReleaseSoloLocalGateMatrixResult {
  const profileId = normalizeProfileId(options.profileId)
  const matrixPath = releaseSoloLocalGateMatrixPath(profileId)
  const errors: string[] = []

  if (!existsSync(matrixPath)) {
    return {
      profileId,
      ok: false,
      errors: [`release solo/local gate matrix missing: ${matrixPath}`],
    }
  }

  const matrix = JSON.parse(readFileSync(matrixPath, 'utf8')) as SoloLocalReleaseGateMatrix
  if (matrix.status !== 'current Stage 847 solo-local release gate matrix') {
    errors.push('matrix status is not current Stage 847 solo-local release gate matrix')
  }
  if (matrix.profileId !== profileId) errors.push(`matrix profileId mismatch: ${matrix.profileId}`)
  if (matrix.laneMode !== 'one-person-local-dev') errors.push(`laneMode mismatch: ${matrix.laneMode}`)
  if (matrix.currentDecision.hostedCiRequiredNow !== false) errors.push('hostedCiRequiredNow must be false')
  if (matrix.currentDecision.localReplayIsHostedEvidence !== false) {
    errors.push('localReplayIsHostedEvidence must be false')
  }
  if (matrix.currentDecision.stagingProdRequiredNow !== false) errors.push('stagingProdRequiredNow must be false')
  if (matrix.currentDecision.physicalSplitAllowed !== false) errors.push('physicalSplitAllowed must be false')

  if (JSON.stringify(matrix.formalLocalGates) !== JSON.stringify(EXPECTED_LOCAL_GATES)) {
    errors.push('formal local gate matrix drift')
  }
  if (JSON.stringify(matrix.deferredExternalGates) !== JSON.stringify(EXPECTED_DEFERRED_EXTERNAL_GATES)) {
    errors.push('deferred external gate matrix drift')
  }

  for (const gate of matrix.formalLocalGates) {
    if (gate.startsService) errors.push(`${gate.gateId} must be non-starting`)
    if (gate.requiresHostedEvidence) errors.push(`${gate.gateId} must not require hosted evidence`)
    if (gate.requiresStagingProdEndpoint) errors.push(`${gate.gateId} must not require staging/prod endpoints`)
    if (!gate.reason.trim()) errors.push(`${gate.gateId} reason is empty`)
  }

  const releaseCandidateSteps = buildReleaseCandidateGateSteps(profileId)
  const matrixStepIndex = releaseCandidateSteps.findIndex((step) => step.name === 'validate solo-local release gate matrix')
  const mandatoryStepIndex = releaseCandidateSteps.findIndex(
    (step) => step.name === 'validate release boundary mandatory artifacts',
  )
  if (matrixStepIndex < 0) {
    errors.push('release candidate gate is missing validate solo-local release gate matrix')
  }
  if (matrixStepIndex >= 0 && mandatoryStepIndex >= 0 && matrixStepIndex > mandatoryStepIndex) {
    errors.push('release candidate gate must run solo-local matrix before mandatory artifacts')
  }

  for (const nonClaim of REQUIRED_NON_CLAIMS) {
    if (!matrix.nonClaims.includes(nonClaim)) {
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
  const normalized = profileId.trim() || DEFAULT_RELEASE_SOLO_LOCAL_GATE_MATRIX_PROFILE
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`invalid release solo/local gate matrix profile id: ${profileId}`)
  }
  return normalized
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try {
    const result = validateReleaseSoloLocalGateMatrix(parseReleaseSoloLocalGateMatrixArgs(process.argv.slice(2)))
    if (!result.ok) {
      throw new Error(`release solo/local gate matrix invalid: ${result.errors.join('; ')}`)
    }
    console.log(`[release-solo-local-gate-matrix] ${result.profileId} ok`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
