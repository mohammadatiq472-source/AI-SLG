import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

const cleanupPolicyPath = 'ops/release-artifacts/local-dev.release-boundary-historical-artifact-cleanup-policy.json'
const retentionPath = 'ops/release-artifacts/local-dev.release-boundary-historical-artifact-retention.json'
const historicalArtifactPath = 'ops/release-artifacts/local-dev.server-release-artifact.json'
const generatedReplacementPath = 'ops/release-artifacts/generated/local-dev.server-release-artifact.json'
const stage845Guard = 'release_boundary_historical_artifact_cleanup_policy_guard'

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['release:boundary-historical-artifact-cleanup-policy:check'],
  'tsx scripts/validate_release_boundary_historical_artifact_cleanup_policy.ts',
  'package.json must expose the historical artifact cleanup policy validator',
)
assert.equal(
  packageJson.scripts?.['test:release-boundary-historical-artifact-cleanup-policy-stage845-contract'],
  'tsx server/tests/release_boundary_historical_artifact_cleanup_policy_stage845_contract.test.ts',
  'package.json must expose the Stage 845 historical artifact cleanup policy contract',
)

assert.ok(existsSync(cleanupPolicyPath), `missing cleanup policy manifest: ${cleanupPolicyPath}`)
const cleanupPolicy = JSON.parse(readUtf8(cleanupPolicyPath)) as {
  status: string
  profileId: string
  policyId: string
  cleanupMode: string
  defaultAction: string
  deletionAllowed: boolean
  targetArtifacts: Array<{
    path: string
    classification: string
    retentionManifestPath: string
    replacementPath: string
    requiredBeforeDeletion: string[]
  }>
  requiredEvidence: string[]
  nonClaims: string[]
}

assert.equal(cleanupPolicy.status, 'current Stage 845 release boundary historical artifact cleanup policy')
assert.equal(cleanupPolicy.profileId, 'local-dev')
assert.equal(cleanupPolicy.policyId, 'release-boundary-historical-artifact-cleanup-policy')
assert.equal(cleanupPolicy.cleanupMode, 'dry-run-only')
assert.equal(cleanupPolicy.defaultAction, 'retain')
assert.equal(cleanupPolicy.deletionAllowed, false)
assert.deepEqual(
  cleanupPolicy.targetArtifacts.map((artifact) => artifact.path),
  [historicalArtifactPath],
  'cleanup policy must target only the current historical top-level artifact',
)

const target = cleanupPolicy.targetArtifacts[0]
assert.equal(target.classification, 'historical-reference')
assert.equal(target.retentionManifestPath, retentionPath)
assert.equal(target.replacementPath, generatedReplacementPath)
for (const prerequisite of [
  'hosted release candidate archive includes generated replacement',
  'Stage 844 retention manifest removalAllowed is true',
  'CURRENT handoff records deletion approval and evidence',
]) {
  assert.ok(target.requiredBeforeDeletion.includes(prerequisite), `missing deletion prerequisite: ${prerequisite}`)
}
for (const evidence of [
  retentionPath,
  generatedReplacementPath,
  'docs/RELEASE_CANDIDATE_GITHUB_ACTIONS_RUN_ARCHIVE_CURRENT_2026_06_16.md',
]) {
  assert.ok(cleanupPolicy.requiredEvidence.includes(evidence), `missing required evidence: ${evidence}`)
}
for (const nonClaim of [
  'does not delete historical artifacts',
  'does not claim hosted archive evidence exists',
  'does not run release:candidate:local-dev',
  'does not start server:dev or tsx watch',
]) {
  assert.ok(cleanupPolicy.nonClaims.includes(nonClaim), `missing non-claim: ${nonClaim}`)
}
assert.ok(existsSync(target.path), `historical artifact must remain present: ${target.path}`)
assert.ok(existsSync(target.retentionManifestPath), `retention manifest must exist: ${target.retentionManifestPath}`)
assert.ok(existsSync(target.replacementPath), `replacement artifact must exist: ${target.replacementPath}`)

const validator = readUtf8('scripts/validate_release_boundary_historical_artifact_cleanup_policy.ts')
for (const token of [
  cleanupPolicyPath,
  'dry-run-only',
  'deletionAllowed',
  'hosted release candidate archive includes generated replacement',
]) {
  assertIncludes(validator, token, 'cleanup policy validator')
}

const mandatory = readUtf8('ops/release-artifacts/local-dev.release-boundary-mandatory-artifacts.json')
assertIncludes(mandatory, 'release_boundary_historical_artifact_cleanup_policy', 'mandatory checklist')
assertIncludes(mandatory, cleanupPolicyPath, 'mandatory checklist')

const coverage = readUtf8('ops/release-artifacts/local-dev.release-boundary-artifact-coverage.json')
assertIncludes(coverage, cleanupPolicyPath, 'coverage manifest')
assertIncludes(coverage, 'historical artifact cleanup policy', 'coverage manifest')

const archiveDoc = readUtf8('docs/RELEASE_CANDIDATE_GITHUB_ACTIONS_RUN_ARCHIVE_CURRENT_2026_06_16.md')
assertIncludes(archiveDoc, cleanupPolicyPath, 'GitHub archive doc')

const current = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const token of [
  'Stage 845 - Release Boundary Historical Artifact Cleanup Policy Guard',
  cleanupPolicyPath,
  'does not delete historical artifacts',
  'does not run `release:candidate:local-dev`, Godot export, full visual smoke, `server:dev`, or `tsx watch`',
]) {
  assertIncludes(current, token, 'CURRENT handoff')
}

const progress = JSON.parse(readUtf8('ops/release-artifacts/local-dev.boundary-convergence-progress.json')) as {
  completedStages: Array<{ stageId: number | string; status: string; evidence: string[] }>
  mandatoryGuards: string[]
}
const stage845 = progress.completedStages.find((stage) => stage.stageId === 845)
assert.ok(stage845, 'Stage 826 progress manifest must record Stage 845')
assert.equal(stage845.status, 'formal-green-static-release-boundary-historical-artifact-cleanup-policy')
assert.ok(stage845.evidence.includes(cleanupPolicyPath))
assert.ok(
  progress.mandatoryGuards.includes(stage845Guard),
  'Stage 826 progress manifest must require the Stage 845 historical artifact cleanup policy guard',
)

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 845', 'split target')
assertIncludes(splitTarget, 'historical artifact cleanup policy', 'split target')

const megaPlan = readUtf8('docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md')
assertIncludes(megaPlan, 'Stage 845', 'mega plan')
assertIncludes(megaPlan, stage845Guard, 'mega plan')
