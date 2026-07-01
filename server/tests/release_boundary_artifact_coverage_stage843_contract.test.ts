import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

const coveragePath = 'ops/release-artifacts/local-dev.release-boundary-artifact-coverage.json'
const stage843Guard = 'release_boundary_artifact_coverage_guard'

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['release:boundary-artifact-coverage:check'],
  'tsx scripts/validate_release_boundary_artifact_coverage.ts',
  'package.json must expose the release boundary artifact coverage validator',
)
assert.equal(
  packageJson.scripts?.['test:release-boundary-artifact-coverage-stage843-contract'],
  'tsx server/tests/release_boundary_artifact_coverage_stage843_contract.test.ts',
  'package.json must expose the Stage 843 release boundary artifact coverage contract',
)

assert.ok(existsSync(coveragePath), `missing release boundary artifact coverage manifest: ${coveragePath}`)
const coverage = JSON.parse(readUtf8(coveragePath)) as {
  status: string
  profileId: string
  scannedDirectory: string
  coverageRule: string
  artifacts: Array<{
    path: string
    mandatoryChecklistRequired: boolean
    githubArchiveRequired: boolean
    stage826Required: boolean
    rationale: string
  }>
  nonClaims: string[]
}

assert.equal(coverage.status, 'current Stage 843 release boundary artifact coverage')
assert.equal(coverage.profileId, 'local-dev')
assert.equal(coverage.scannedDirectory, 'ops/release-artifacts')
assert.equal(
  coverage.coverageRule,
  'every top-level local-dev release-boundary artifact must declare mandatory checklist, GitHub archive, and Stage 826 coverage intent',
)

const expectedPaths = readdirSync('ops/release-artifacts')
  .filter((name) => name.startsWith('local-dev.') && name.endsWith('.json'))
  .map((name) => `ops/release-artifacts/${name}`)
  .sort()
assert.deepEqual(
  coverage.artifacts.map((artifact) => artifact.path).sort(),
  expectedPaths,
  'coverage manifest must classify every top-level local-dev release-boundary artifact',
)

const mandatoryChecklist = readUtf8('ops/release-artifacts/local-dev.release-boundary-mandatory-artifacts.json')
const archiveDoc = readUtf8('docs/RELEASE_CANDIDATE_GITHUB_ACTIONS_RUN_ARCHIVE_CURRENT_2026_06_16.md')
const stage826 = readUtf8('ops/release-artifacts/local-dev.boundary-convergence-progress.json')

for (const artifact of coverage.artifacts) {
  assert.notEqual(artifact.rationale.trim(), '', `${artifact.path} must explain its coverage rationale`)
  if (artifact.mandatoryChecklistRequired) {
    assertIncludes(mandatoryChecklist, artifact.path, 'mandatory artifact checklist')
  }
  if (artifact.githubArchiveRequired) {
    assertIncludes(archiveDoc, artifact.path, 'GitHub Actions archive doc')
  }
  if (artifact.stage826Required) {
    assertIncludes(stage826, artifact.path, 'Stage 826 convergence manifest')
  }
}

for (const nonClaim of [
  'does not run release:candidate:local-dev',
  'does not start server:dev or tsx watch',
  'does not delete tmp evidence',
]) {
  assert.ok(coverage.nonClaims.includes(nonClaim), `missing non-claim: ${nonClaim}`)
}

const validator = readUtf8('scripts/validate_release_boundary_artifact_coverage.ts')
assertIncludes(validator, coveragePath, 'coverage validator')
assertIncludes(validator, 'mandatoryChecklistRequired', 'coverage validator')
assertIncludes(validator, 'githubArchiveRequired', 'coverage validator')
assertIncludes(validator, 'stage826Required', 'coverage validator')

const current = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const token of [
  'Stage 843 - Release Boundary Artifact Coverage Guard',
  coveragePath,
  'does not run `release:candidate:local-dev`, Godot export, full visual smoke, `server:dev`, or `tsx watch`',
]) {
  assertIncludes(current, token, 'CURRENT handoff')
}

const progress = JSON.parse(stage826) as {
  completedStages: Array<{ stageId: number | string; status: string; evidence: string[] }>
  mandatoryGuards: string[]
}
const stage843 = progress.completedStages.find((stage) => stage.stageId === 843)
assert.ok(stage843, 'Stage 826 progress manifest must record Stage 843')
assert.equal(stage843.status, 'formal-green-static-release-boundary-artifact-coverage')
assert.ok(stage843.evidence.includes(coveragePath))
assert.ok(
  progress.mandatoryGuards.includes(stage843Guard),
  'Stage 826 progress manifest must require the Stage 843 artifact coverage guard',
)

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 843', 'split target')
assertIncludes(splitTarget, 'release boundary artifact coverage', 'split target')

const megaPlan = readUtf8('docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md')
assertIncludes(megaPlan, 'Stage 843', 'mega plan')
assertIncludes(megaPlan, stage843Guard, 'mega plan')
