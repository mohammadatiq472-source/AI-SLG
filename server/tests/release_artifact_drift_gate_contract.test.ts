import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildReleaseArtifactDriftChecks,
  parseReleaseArtifactDriftArgs,
  releaseArtifactDriftTargets,
  verifyReleaseArtifactDrift,
} from '../../scripts/verify_release_artifact_drift'
import { buildReleaseCandidateGateSteps } from '../../scripts/run_release_candidate_gate'

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['release:artifact-drift:check'],
  'tsx scripts/verify_release_artifact_drift.ts',
  'package.json must expose release:artifact-drift:check as the formal artifact drift gate',
)
assert.equal(
  packageJson.scripts?.['test:release-artifact-drift-gate-contract'],
  'tsx server/tests/release_artifact_drift_gate_contract.test.ts',
  'package.json must expose test:release-artifact-drift-gate-contract',
)
assert.equal(
  packageJson.scripts?.['ci:release-candidate:local-dev'],
  'npm run release:candidate:local-dev --',
  'CI must reuse the formal local-dev release candidate chain and preserve passthrough args such as --dry-run',
)
assert.equal(
  packageJson.scripts?.['release:preflight:local-dev'],
  'npm run release:candidate:local-dev --',
  'pre-release must reuse the same release candidate chain and preserve passthrough args such as --dry-run',
)

const workflow = readFileSync('.github/workflows/release-candidate-boundary-gate.yml', 'utf8')
assert.ok(
  workflow.includes('name: release-candidate-boundary-gate'),
  'GitHub workflow must expose the release candidate boundary gate',
)
assert.ok(
  workflow.includes('pull_request:') && workflow.includes('workflow_dispatch:'),
  'release candidate boundary gate must be available in CI and manual release preflight runs',
)
assert.ok(
  workflow.includes('runs-on: windows-latest'),
  'release candidate CI must run on Windows because the current Godot export wrapper is Windows-shaped',
)
assert.ok(
  workflow.includes('npm run ci:release-candidate:local-dev'),
  'workflow must call the CI alias for the formal release candidate chain',
)
for (const forbiddenDirectGate of [
  'npm run godot:release:export',
  'npm run release:artifact-drift:check',
  'npm run release:ops:check',
]) {
  assert.equal(
    workflow.includes(forbiddenDirectGate),
    false,
    `workflow must not bypass release:candidate by calling ${forbiddenDirectGate} directly`,
  )
}

assert.deepEqual(parseReleaseArtifactDriftArgs([]), { profileId: 'local-dev' })
assert.deepEqual(parseReleaseArtifactDriftArgs(['--profile', 'local-dev']), { profileId: 'local-dev' })
assert.deepEqual(parseReleaseArtifactDriftArgs(['--profile=local-dev']), { profileId: 'local-dev' })
assert.throws(
  () => parseReleaseArtifactDriftArgs(['--profile', '../prod']),
  /invalid release artifact drift profile id/,
  'profile ids must reject path traversal',
)

assert.deepEqual(releaseArtifactDriftTargets('local-dev'), [
  {
    label: 'server release artifact',
    path: 'ops/release-artifacts/generated/local-dev.server-release-artifact.json',
    owner: 'server-owned',
  },
  {
    label: 'client package manifest',
    path: 'ops/release-artifacts/generated/local-dev.client-package-manifest.json',
    owner: 'client-owned',
  },
  {
    label: 'AI subject boundary manifest',
    path: 'ops/release-artifacts/generated/local-dev.ai-subject-boundary.json',
    owner: 'AI-read',
  },
  {
    label: 'ops secret restore recovery checklist',
    path: 'ops/release-artifacts/local-dev.ops-release-checklist.json',
    owner: 'ops-only',
  },
])

const checks = buildReleaseArtifactDriftChecks({ profileId: 'local-dev' })
assert.deepEqual(
  checks.map((check) => [check.label, check.status]),
  [
    ['server release artifact', 'clean'],
    ['client package manifest', 'clean'],
    ['AI subject boundary manifest', 'clean'],
    ['ops secret restore recovery checklist', 'validated'],
  ],
)
assert.equal(checks.every((check) => check.ok), true)

const result = verifyReleaseArtifactDrift({ profileId: 'local-dev' })
assert.equal(result.profileId, 'local-dev')
assert.equal(result.ok, true, result.errors.join('; '))
assert.equal(result.checks.length, 4)

const releaseSteps = buildReleaseCandidateGateSteps('local-dev')
assert.ok(
  releaseSteps.some((step) => step.name === 'verify release artifact drift is clean'),
  'release candidate gate must include artifact drift checking',
)
assert.ok(
  releaseSteps.some((step) => (
    step.name === 'verify release artifact drift is clean' &&
    step.args.join(' ') === 'run release:artifact-drift:check -- --profile local-dev'
  )),
  'release candidate gate must pass the selected profile to the artifact drift check',
)
assert.ok(
  releaseSteps.findIndex((step) => step.name === 'verify release artifact drift is clean') >
    releaseSteps.findIndex((step) => step.name === 'validate ops secret restore recovery checklist'),
  'artifact drift must run after all generated release evidence and ops checks',
)

console.log('[release_artifact_drift_gate_contract] all checks passed')
