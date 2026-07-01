import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import {
  buildReleaseCandidateGateSteps,
  shellLineForReleaseCandidateGateStep,
} from '../../scripts/run_release_candidate_gate'

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
  packageJson.scripts?.['test:release-candidate-gameplay-anchor-registry-stage830-contract'],
  'tsx server/tests/release_candidate_gameplay_anchor_registry_stage830_contract.test.ts',
  'package.json must expose the Stage 830 release candidate gameplay anchor registry contract',
)

assert.equal(
  packageJson.scripts?.['test:gameplay-anchor-registry-stage829-contract'],
  'tsx server/tests/gameplay_anchor_registry_stage829_contract.test.ts',
  'package.json must keep the Stage 829 gameplay anchor registry contract available',
)

const registryPath = 'ops/release-artifacts/local-dev.gameplay-anchor-registry.json'
const stage826Path = 'ops/release-artifacts/local-dev.boundary-convergence-progress.json'
const currentPath = 'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md'
const splitTargetPath = 'docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md'
const megaPlanPath = 'docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md'

assert.ok(existsSync(registryPath), `missing gameplay anchor registry: ${registryPath}`)

const steps = buildReleaseCandidateGateSteps('local-dev')
const registryStep = steps.find((step) => step.name === 'validate gameplay anchor registry')
assert.ok(registryStep, 'release candidate must validate the gameplay anchor registry')
assert.deepEqual(registryStep, {
  name: 'validate gameplay anchor registry',
  command: 'npm',
  args: ['run', 'test:gameplay-anchor-registry-stage829-contract'],
})
assertIncludes(
  shellLineForReleaseCandidateGateStep(registryStep),
  'test:gameplay-anchor-registry-stage829-contract',
  'release candidate registry shell line',
)
assert.ok(
  steps.findIndex((step) => step.name === 'validate gameplay anchor registry') <
    steps.findIndex((step) => step.name === 'validate ops secret restore recovery checklist'),
  'gameplay anchor registry must still run before the ops release checklist',
)
assert.ok(
  steps.findIndex((step) => step.name === 'validate gameplay anchor registry') <
    steps.findIndex((step) => step.name === 'verify release artifact drift is clean'),
  'gameplay anchor registry must still run before release artifact drift',
)

const gateSource = readUtf8('scripts/run_release_candidate_gate.ts')
assertIncludes(gateSource, 'validate gameplay anchor registry', 'release candidate gate source')
assertIncludes(gateSource, 'test:gameplay-anchor-registry-stage829-contract', 'release candidate gate source')

const stage826 = JSON.parse(readUtf8(stage826Path)) as {
  completedStages?: Array<{ stageId: number | string; status: string; evidence: string[] }>
  mandatoryGuards?: string[]
}
const stage830 = stage826.completedStages?.find((item) => item.stageId === 830)
assert.ok(stage830, 'Stage 826 convergence manifest must record Stage 830')
assert.equal(stage830.status, 'formal-green-static-release-gate')
assert.ok(stage830.evidence.includes('scripts/run_release_candidate_gate.ts'), 'Stage 830 evidence must include release gate source')
assert.ok(
  stage830.evidence.includes('server/tests/release_candidate_gameplay_anchor_registry_stage830_contract.test.ts'),
  'Stage 830 evidence must include the Stage 830 contract',
)
assert.ok(
  stage826.mandatoryGuards?.includes('release_candidate_gameplay_anchor_registry_gate'),
  'Stage 826 must list release_candidate_gameplay_anchor_registry_gate',
)

const current = readUtf8(currentPath)
for (const token of [
  'Stage 830 - Release Candidate Gameplay Anchor Registry Gate',
  'validate gameplay anchor registry',
  'does not run `release:candidate:local-dev`',
]) {
  assertIncludes(current, token, 'CURRENT Stage 830')
}

const splitTarget = readUtf8(splitTargetPath)
assertIncludes(splitTarget, 'Stage 830', 'split target')
assertIncludes(splitTarget, 'validate gameplay anchor registry', 'split target')

const megaPlan = readUtf8(megaPlanPath)
assertIncludes(megaPlan, 'Stage 830', 'mega plan')
assertIncludes(megaPlan, 'release candidate gameplay anchor registry gate', 'mega plan')

console.log('[release_candidate_gameplay_anchor_registry_stage830_contract] all checks passed')
