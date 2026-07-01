import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { buildReleaseCandidateGateSteps } from '../../scripts/run_release_candidate_gate'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

const checklistPath = 'ops/release-artifacts/local-dev.release-boundary-mandatory-artifacts.json'
const requiredArtifactIds = [
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
]

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['release:boundary-artifacts:check'],
  'tsx scripts/validate_release_boundary_mandatory_artifacts.ts',
  'package.json must expose the release boundary mandatory artifact validator',
)
assert.equal(
  packageJson.scripts?.['test:release-boundary-mandatory-artifacts-stage838-contract'],
  'tsx server/tests/release_boundary_mandatory_artifacts_stage838_contract.test.ts',
  'package.json must expose the Stage 838 mandatory artifact checklist contract',
)

assert.ok(existsSync(checklistPath), `missing mandatory artifact checklist: ${checklistPath}`)
const checklist = JSON.parse(readUtf8(checklistPath)) as {
  status: string
  profileId: string
  releaseCandidateGateStep: string
  artifacts: Array<{
    artifactId: string
    path: string
    owner: string
    releaseGate: string
    boundaryRole: string
  }>
  nonClaims: string[]
}

assert.equal(checklist.status, 'current Stage 838 release boundary mandatory artifact checklist')
assert.equal(checklist.profileId, 'local-dev')
assert.equal(checklist.releaseCandidateGateStep, 'validate release boundary mandatory artifacts')
assert.deepEqual(
  checklist.artifacts.map((artifact) => artifact.artifactId),
  requiredArtifactIds,
  'mandatory artifact checklist must keep the canonical artifact order',
)

for (const artifact of checklist.artifacts) {
  assert.notEqual(artifact.path, '', `${artifact.artifactId} must declare a path`)
  assert.notEqual(artifact.owner, '', `${artifact.artifactId} must declare an owner`)
  assert.notEqual(artifact.releaseGate, '', `${artifact.artifactId} must declare a release gate`)
  assert.notEqual(artifact.boundaryRole, '', `${artifact.artifactId} must declare a boundary role`)
  assert.ok(existsSync(artifact.path), `mandatory artifact path must exist: ${artifact.path}`)
}

for (const requiredNonClaim of [
  'no hosted GitHub Actions run evidence is claimed',
  'no staging/prod endpoint profile is invented',
  'no physical source movement is allowed',
  'no service is started by this checklist',
]) {
  assert.ok(checklist.nonClaims.includes(requiredNonClaim), `missing non-claim: ${requiredNonClaim}`)
}

const validator = readUtf8('scripts/validate_release_boundary_mandatory_artifacts.ts')
for (const token of [
  checklistPath,
  'client_package_manifest',
  'server_release_artifact',
  'github_actions_run_archive_contract',
  'release boundary mandatory artifacts',
]) {
  assertIncludes(validator, token, 'mandatory artifact validator')
}

const steps = buildReleaseCandidateGateSteps('local-dev')
assert.equal(steps[3]?.name, 'validate release boundary mandatory artifacts')
assert.deepEqual(steps[3], {
  name: 'validate release boundary mandatory artifacts',
  command: 'npm',
  args: ['run', 'release:boundary-artifacts:check', '--', '--profile', 'local-dev'],
})
assert.equal(steps[0]?.name, 'validate service launch boundary registry')
assert.equal(steps[1]?.name, 'validate direct backend spawn guard index')
assert.equal(steps[2]?.name, 'validate solo-local release gate matrix')
assert.equal(steps[4]?.name, 'run Godot release export wrapper')

const current = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const token of [
  'Stage 838 - Release Boundary Mandatory Artifact Checklist',
  checklistPath,
  'validate release boundary mandatory artifacts',
  'does not run `release:candidate:local-dev`, Godot export, full visual smoke, `server:dev`, or `tsx watch`',
]) {
  assertIncludes(current, token, 'CURRENT handoff')
}

const progress = JSON.parse(readUtf8('ops/release-artifacts/local-dev.boundary-convergence-progress.json')) as {
  completedStages: Array<{ stageId: number | string; status: string; evidence: string[] }>
  mandatoryGuards: string[]
}
const stage838 = progress.completedStages.find((stage) => stage.stageId === 838)
assert.ok(stage838, 'Stage 826 progress manifest must record Stage 838')
assert.equal(stage838.status, 'formal-green-static-release-boundary-mandatory-artifacts')
assert.ok(stage838.evidence.includes(checklistPath))
assert.ok(
  progress.mandatoryGuards.includes('release_boundary_mandatory_artifacts_guard'),
  'Stage 826 progress manifest must require the mandatory artifact checklist guard',
)

console.log('[release_boundary_mandatory_artifacts_stage838_contract] all checks passed')
