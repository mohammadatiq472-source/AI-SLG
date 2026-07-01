import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildReleaseCandidateGateSteps } from '../../scripts/run_release_candidate_gate'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['test:release-candidate-service-launch-registry-stage835-contract'],
  'tsx server/tests/release_candidate_service_launch_registry_stage835_contract.test.ts',
  'package.json must expose the Stage 835 release candidate service-launch registry contract',
)

const steps = buildReleaseCandidateGateSteps('local-dev')
assert.equal(
  steps[0]?.name,
  'validate service launch boundary registry',
  'release candidate must validate service launch registry before any Godot export or backend-capable step',
)
assert.deepEqual(steps[0], {
  name: 'validate service launch boundary registry',
  command: 'npm',
  args: ['run', 'test:service-launch-boundary-registry-stage834-contract'],
})
assert.equal(steps[1]?.name, 'validate direct backend spawn guard index')
assert.equal(steps[2]?.name, 'validate solo-local release gate matrix')
assert.equal(steps[3]?.name, 'validate release boundary mandatory artifacts')
assert.equal(steps[4]?.name, 'run Godot release export wrapper')
assert.ok(
  steps.findIndex((step) => step.name === 'validate service launch boundary registry') <
    steps.findIndex((step) => step.name === 'run Godot release export wrapper'),
  'service launch registry must run before Godot release export wrapper',
)

const releaseGate = readUtf8('scripts/run_release_candidate_gate.ts')
assertIncludes(releaseGate, 'validate service launch boundary registry', 'release candidate gate')
assertIncludes(releaseGate, 'test:service-launch-boundary-registry-stage834-contract', 'release candidate gate')

const current = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const token of [
  'Stage 835 - Release Candidate Service Launch Registry Gate',
  'validate service launch boundary registry',
  'does not run `release:candidate:local-dev`, Godot export, full visual smoke, `server:dev`, or `tsx watch`',
]) {
  assertIncludes(current, token, 'CURRENT handoff')
}

const progress = JSON.parse(readUtf8('ops/release-artifacts/local-dev.boundary-convergence-progress.json')) as {
  completedStages: Array<{ stageId: number | string; status: string; evidence: string[] }>
  mandatoryGuards: string[]
}
const stage835 = progress.completedStages.find((stage) => stage.stageId === 835)
assert.ok(stage835, 'Stage 826 progress manifest must record Stage 835')
assert.equal(stage835.status, 'formal-green-static-release-service-launch-registry-gate')
assert.ok(stage835.evidence.includes('scripts/run_release_candidate_gate.ts'))
assert.ok(
  progress.mandatoryGuards.includes('release_candidate_service_launch_registry_gate'),
  'Stage 826 progress manifest must require the release candidate service-launch registry gate',
)

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 835', 'split target')
assertIncludes(splitTarget, 'validate service launch boundary registry', 'split target')

const megaPlan = readUtf8('docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md')
assertIncludes(megaPlan, 'Stage 835', 'mega plan')
assertIncludes(megaPlan, 'release candidate service launch registry gate', 'mega plan')

console.log('[release_candidate_service_launch_registry_stage835_contract] all checks passed')
