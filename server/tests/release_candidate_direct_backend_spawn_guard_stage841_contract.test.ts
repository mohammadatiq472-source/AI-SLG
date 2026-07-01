import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { buildReleaseCandidateGateSteps } from '../../scripts/run_release_candidate_gate'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

const guardName = 'validate direct backend spawn guard index'
const guardScript = 'service:direct-backend-spawn-guard:check'
const stage841Guard = 'release_candidate_direct_backend_spawn_guard_gate'

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['test:release-candidate-direct-backend-spawn-guard-stage841-contract'],
  'tsx server/tests/release_candidate_direct_backend_spawn_guard_stage841_contract.test.ts',
  'package.json must expose the Stage 841 release-candidate direct backend spawn guard contract',
)

const steps = buildReleaseCandidateGateSteps('local-dev')
assert.deepEqual(steps.slice(0, 5), [
  {
    name: 'validate service launch boundary registry',
    command: 'npm',
    args: ['run', 'test:service-launch-boundary-registry-stage834-contract'],
  },
  {
    name: guardName,
    command: 'npm',
    args: ['run', guardScript, '--', '--profile', 'local-dev'],
  },
  {
    name: 'validate solo-local release gate matrix',
    command: 'npm',
    args: ['run', 'release:solo-local-gate-matrix:check', '--', '--profile', 'local-dev'],
  },
  {
    name: 'validate release boundary mandatory artifacts',
    command: 'npm',
    args: ['run', 'release:boundary-artifacts:check', '--', '--profile', 'local-dev'],
  },
  {
    name: 'run Godot release export wrapper',
    command: 'npm',
    args: ['run', 'godot:release:export', '--', '--profile', 'local-dev'],
  },
])
assert.ok(
  steps.findIndex((step) => step.name === guardName) <
    steps.findIndex((step) => step.name === 'run Godot release export wrapper'),
  'direct backend spawn guard must run before Godot release export wrapper',
)

const releaseGate = readUtf8('scripts/run_release_candidate_gate.ts')
assertIncludes(releaseGate, guardName, 'release candidate gate')
assertIncludes(releaseGate, guardScript, 'release candidate gate')

const workflow = readUtf8('.github/workflows/release-candidate-boundary-gate.yml')
for (const token of [
  '- releaseDryRunStep1: `validate service launch boundary registry`',
  '- releaseDryRunStep2: `validate direct backend spawn guard index`',
  '- releaseDryRunStep3: `validate solo-local release gate matrix`',
  '- releaseDryRunStep4: `validate release boundary mandatory artifacts`',
  '- releaseDryRunStep5: `run Godot release export wrapper`',
]) {
  assertIncludes(workflow, token, 'release candidate workflow anti-freeze summary')
}

const archiveDoc = readUtf8('docs/RELEASE_CANDIDATE_GITHUB_ACTIONS_RUN_ARCHIVE_CURRENT_2026_06_16.md')
assertIncludes(archiveDoc, 'releaseDryRunStep2=validate direct backend spawn guard index', 'run archive doc')
assertIncludes(archiveDoc, 'releaseDryRunStep5=run Godot release export wrapper', 'run archive doc')

const archiveValidator = readUtf8('scripts/validate_release_github_actions_run_archive.ts')
assertIncludes(archiveValidator, 'validate direct backend spawn guard index', 'run archive validator')
assertIncludes(archiveValidator, 'releaseDryRunStep5', 'run archive validator')

const runArchiveContract = readUtf8('server/tests/release_github_actions_run_archive_contract.test.ts')
assertIncludes(runArchiveContract, 'releaseDryRunStep5', 'run archive contract')
assertIncludes(runArchiveContract, 'validate direct backend spawn guard index', 'run archive contract')

const current = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const token of [
  'Stage 841 - Release Candidate Direct Backend Spawn Guard Gate',
  guardName,
  'does not run `release:candidate:local-dev`, Godot export, full visual smoke, `server:dev`, or `tsx watch`',
]) {
  assertIncludes(current, token, 'CURRENT handoff')
}

const progress = JSON.parse(readUtf8('ops/release-artifacts/local-dev.boundary-convergence-progress.json')) as {
  completedStages: Array<{ stageId: number | string; status: string; evidence: string[] }>
  mandatoryGuards: string[]
}
const stage841 = progress.completedStages.find((stage) => stage.stageId === 841)
assert.ok(stage841, 'Stage 826 progress manifest must record Stage 841')
assert.equal(stage841.status, 'formal-green-static-release-direct-backend-spawn-guard-gate')
assert.ok(stage841.evidence.includes('scripts/run_release_candidate_gate.ts'))
assert.ok(
  progress.mandatoryGuards.includes(stage841Guard),
  'Stage 826 progress manifest must require the Stage 841 release candidate direct backend spawn guard',
)

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 841', 'split target')
assertIncludes(splitTarget, guardName, 'split target')

const megaPlan = readUtf8('docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md')
assertIncludes(megaPlan, 'Stage 841', 'mega plan')
assertIncludes(megaPlan, stage841Guard, 'mega plan')
