import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

const retentionPath = 'ops/release-artifacts/local-dev.release-boundary-historical-artifact-retention.json'
const coveragePath = 'ops/release-artifacts/local-dev.release-boundary-artifact-coverage.json'
const historicalArtifactPath = 'ops/release-artifacts/local-dev.server-release-artifact.json'
const generatedReplacementPath = 'ops/release-artifacts/generated/local-dev.server-release-artifact.json'
const stage844Guard = 'release_boundary_historical_artifact_retention_guard'

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['release:boundary-historical-artifacts:check'],
  'tsx scripts/validate_release_boundary_historical_artifacts.ts',
  'package.json must expose the historical release-boundary artifact validator',
)
assert.equal(
  packageJson.scripts?.['test:release-boundary-historical-artifact-retention-stage844-contract'],
  'tsx server/tests/release_boundary_historical_artifact_retention_stage844_contract.test.ts',
  'package.json must expose the Stage 844 historical artifact retention contract',
)

assert.ok(existsSync(retentionPath), `missing historical artifact retention manifest: ${retentionPath}`)
const retention = JSON.parse(readUtf8(retentionPath)) as {
  status: string
  profileId: string
  artifacts: Array<{
    path: string
    classification: string
    replacementPath: string
    keepUntil: string
    removalAllowed: boolean
    removalPrerequisites: string[]
    rationale: string
  }>
  nonClaims: string[]
}

assert.equal(retention.status, 'current Stage 844 release boundary historical artifact retention')
assert.equal(retention.profileId, 'local-dev')
assert.deepEqual(
  retention.artifacts.map((artifact) => artifact.path),
  [historicalArtifactPath],
  'retention manifest must classify the current historical top-level artifact',
)

const historical = retention.artifacts[0]
assert.equal(historical.classification, 'historical-reference')
assert.equal(historical.replacementPath, generatedReplacementPath)
assert.equal(historical.keepUntil, 'after hosted release candidate archive proves generated replacement is retained')
assert.equal(historical.removalAllowed, false)
for (const prerequisite of [
  'generated replacement exists',
  'coverage manifest records historical-reference rationale',
  'CURRENT handoff records removal is not performed',
]) {
  assert.ok(historical.removalPrerequisites.includes(prerequisite), `missing prerequisite: ${prerequisite}`)
}
assert.ok(existsSync(historical.path), `historical artifact must still exist: ${historical.path}`)
assert.ok(existsSync(historical.replacementPath), `replacement artifact must exist: ${historical.replacementPath}`)
assert.notEqual(historical.rationale.trim(), '', 'historical artifact must explain retention rationale')

const coverage = readUtf8(coveragePath)
assertIncludes(coverage, historicalArtifactPath, 'coverage manifest')
assertIncludes(coverage, 'historical top-level server artifact reference', 'coverage manifest')

const validator = readUtf8('scripts/validate_release_boundary_historical_artifacts.ts')
assertIncludes(validator, retentionPath, 'historical artifact validator')
assertIncludes(validator, 'historical-reference', 'historical artifact validator')
assertIncludes(validator, 'removalAllowed', 'historical artifact validator')

for (const nonClaim of [
  'does not delete historical artifacts',
  'does not run release:candidate:local-dev',
  'does not start server:dev or tsx watch',
]) {
  assert.ok(retention.nonClaims.includes(nonClaim), `missing non-claim: ${nonClaim}`)
}

const current = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const token of [
  'Stage 844 - Release Boundary Historical Artifact Retention Guard',
  retentionPath,
  'does not delete historical artifacts',
  'does not run `release:candidate:local-dev`, Godot export, full visual smoke, `server:dev`, or `tsx watch`',
]) {
  assertIncludes(current, token, 'CURRENT handoff')
}

const progress = JSON.parse(readUtf8('ops/release-artifacts/local-dev.boundary-convergence-progress.json')) as {
  completedStages: Array<{ stageId: number | string; status: string; evidence: string[] }>
  mandatoryGuards: string[]
}
const stage844 = progress.completedStages.find((stage) => stage.stageId === 844)
assert.ok(stage844, 'Stage 826 progress manifest must record Stage 844')
assert.equal(stage844.status, 'formal-green-static-release-boundary-historical-artifact-retention')
assert.ok(stage844.evidence.includes(retentionPath))
assert.ok(
  progress.mandatoryGuards.includes(stage844Guard),
  'Stage 826 progress manifest must require the Stage 844 historical artifact retention guard',
)

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 844', 'split target')
assertIncludes(splitTarget, 'historical artifact retention', 'split target')

const megaPlan = readUtf8('docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md')
assertIncludes(megaPlan, 'Stage 844', 'mega plan')
assertIncludes(megaPlan, stage844Guard, 'mega plan')
