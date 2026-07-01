import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import { buildReleaseCandidateGateSteps } from '../../scripts/run_release_candidate_gate'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

const matrixPath = 'ops/release-artifacts/local-dev.solo-local-release-gate-matrix.json'
const validatorScript = 'scripts/validate_release_solo_local_gate_matrix.ts'
const stage847Guard = 'solo_local_release_gate_matrix_guard'

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['release:solo-local-gate-matrix:check'],
  'tsx scripts/validate_release_solo_local_gate_matrix.ts',
  'package.json must expose the solo/local release gate matrix validator',
)
assert.equal(
  packageJson.scripts?.['test:release-solo-local-gate-matrix-stage847-contract'],
  'tsx server/tests/release_solo_local_gate_matrix_stage847_contract.test.ts',
  'package.json must expose the Stage 847 solo/local release gate matrix contract',
)

const steps = buildReleaseCandidateGateSteps('local-dev')
const soloStepIndex = steps.findIndex((step) => step.name === 'validate solo-local release gate matrix')
const mandatoryStepIndex = steps.findIndex((step) => step.name === 'validate release boundary mandatory artifacts')
const exportStepIndex = steps.findIndex((step) => step.name === 'run Godot release export wrapper')
assert.ok(soloStepIndex >= 0, 'release candidate must include the solo-local matrix gate')
assert.ok(soloStepIndex < mandatoryStepIndex, 'solo-local matrix gate must run before mandatory artifacts')
assert.ok(soloStepIndex < exportStepIndex, 'solo-local matrix gate must run before Godot export')
assert.deepEqual(steps[soloStepIndex], {
  name: 'validate solo-local release gate matrix',
  command: 'npm',
  args: ['run', 'release:solo-local-gate-matrix:check', '--', '--profile', 'local-dev'],
})

assert.ok(existsSync(matrixPath), `missing solo/local release gate matrix: ${matrixPath}`)
const matrix = JSON.parse(readUtf8(matrixPath)) as {
  status: string
  profileId: string
  laneMode: string
  currentDecision: {
    hostedCiRequiredNow: boolean
    localReplayIsHostedEvidence: boolean
    stagingProdRequiredNow: boolean
    physicalSplitAllowed: boolean
  }
  formalLocalGates: Array<{
    gateId: string
    command: string
    startsService: boolean
    requiresHostedEvidence: boolean
    requiresStagingProdEndpoint: boolean
  }>
  deferredExternalGates: Array<{
    stageId: number
    gateId: string
    status: string
  }>
  nonClaims: string[]
}

assert.equal(matrix.status, 'current Stage 847 solo-local release gate matrix')
assert.equal(matrix.profileId, 'local-dev')
assert.equal(matrix.laneMode, 'one-person-local-dev')
assert.deepEqual(matrix.currentDecision, {
  hostedCiRequiredNow: false,
  localReplayIsHostedEvidence: false,
  stagingProdRequiredNow: false,
  physicalSplitAllowed: false,
})

for (const gateId of [
  'service_process_guard',
  'release_candidate_dry_run_snapshot',
  'release_boundary_mandatory_artifacts',
  'release_boundary_artifact_coverage',
  'release_github_actions_summary_local_replay',
  'github_actions_run_archive_static_contract',
]) {
  const gate = matrix.formalLocalGates.find((entry) => entry.gateId === gateId)
  assert.ok(gate, `missing formal local gate ${gateId}`)
  assert.equal(gate?.startsService, false, `${gateId} must be non-starting`)
  assert.equal(gate?.requiresHostedEvidence, false, `${gateId} must not require hosted evidence`)
  assert.equal(gate?.requiresStagingProdEndpoint, false, `${gateId} must not require staging/prod endpoints`)
}

assert.deepEqual(
  matrix.deferredExternalGates.map((entry) => [entry.stageId, entry.gateId, entry.status]),
  [
    [823, 'hosted_github_actions_run_archive', 'deferred_for_solo_local_until_real_hosted_run_needed'],
    [824, 'staging_prod_endpoint_profiles', 'blocked_until_real_public_endpoints'],
    [825, 'physical_split_readiness', 'blocked_until_stage_823_824_intentionally_green'],
  ],
)

for (const nonClaim of [
  'does not claim hosted GitHub Actions run evidence',
  'does not treat Stage 846 local replay as hosted evidence',
  'does not invent staging/prod endpoints',
  'does not start server:dev or tsx watch',
]) {
  assert.ok(matrix.nonClaims.includes(nonClaim), `missing non-claim: ${nonClaim}`)
}

const validator = readUtf8(validatorScript)
assertIncludes(validator, matrixPath, 'solo/local matrix validator')
assertIncludes(validator, 'localReplayIsHostedEvidence', 'solo/local matrix validator')
assertIncludes(validator, 'deferred_for_solo_local_until_real_hosted_run_needed', 'solo/local matrix validator')

const mandatory = readUtf8('ops/release-artifacts/local-dev.release-boundary-mandatory-artifacts.json')
assertIncludes(mandatory, 'solo_local_release_gate_matrix', 'mandatory checklist')
assertIncludes(mandatory, matrixPath, 'mandatory checklist')

const coverage = readUtf8('ops/release-artifacts/local-dev.release-boundary-artifact-coverage.json')
assertIncludes(coverage, matrixPath, 'coverage manifest')
assertIncludes(coverage, 'solo/local release gate matrix', 'coverage manifest')

const archiveDoc = readUtf8('docs/RELEASE_CANDIDATE_GITHUB_ACTIONS_RUN_ARCHIVE_CURRENT_2026_06_16.md')
assertIncludes(archiveDoc, matrixPath, 'GitHub archive doc')

const snapshot = readUtf8('ops/release-artifacts/local-dev.release-candidate-dry-run-snapshot.json')
assertIncludes(snapshot, 'validate solo-local release gate matrix', 'release candidate dry-run snapshot')
assertIncludes(snapshot, 'release:solo-local-gate-matrix:check', 'release candidate dry-run snapshot')

const current = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const token of [
  'Stage 847 - Solo Local Release Gate Matrix Guard',
  matrixPath,
  'does not treat Stage 846 local replay as hosted evidence',
  'does not run `release:candidate:local-dev`, Godot export, full visual smoke, `server:dev`, or `tsx watch`',
]) {
  assertIncludes(current, token, 'CURRENT handoff')
}

const progress = JSON.parse(readUtf8('ops/release-artifacts/local-dev.boundary-convergence-progress.json')) as {
  completedStages: Array<{ stageId: number | string; status: string; evidence: string[] }>
  mandatoryGuards: string[]
}
const stage847 = progress.completedStages.find((stage) => stage.stageId === 847)
assert.ok(stage847, 'Stage 826 progress manifest must record Stage 847')
assert.equal(stage847.status, 'formal-green-static-solo-local-release-gate-matrix')
assert.ok(stage847.evidence.includes(matrixPath))
assert.ok(progress.mandatoryGuards.includes(stage847Guard), 'Stage 826 must require Stage 847 guard')

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 847', 'split target')
assertIncludes(splitTarget, 'solo/local release gate matrix', 'split target')

const megaPlan = readUtf8('docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md')
assertIncludes(megaPlan, 'Stage 847', 'mega plan')
assertIncludes(megaPlan, stage847Guard, 'mega plan')
