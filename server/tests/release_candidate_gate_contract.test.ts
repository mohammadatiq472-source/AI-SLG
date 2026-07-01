import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildReleaseCandidateGateSteps,
  DEFAULT_RELEASE_CANDIDATE_PROFILE,
  parseReleaseCandidateGateArgs,
  shellLineForReleaseCandidateGateStep,
} from '../../scripts/run_release_candidate_gate'

assert.equal(DEFAULT_RELEASE_CANDIDATE_PROFILE, 'local-dev')

const parsedDefaults = parseReleaseCandidateGateArgs([])
assert.deepEqual(parsedDefaults, {
  profileId: 'local-dev',
  dryRun: false,
})

const parsedCustom = parseReleaseCandidateGateArgs(['--profile', 'staging', '--dry-run'])
assert.deepEqual(parsedCustom, {
  profileId: 'staging',
  dryRun: true,
})

const steps = buildReleaseCandidateGateSteps('local-dev')
assert.deepEqual(
  steps.map((step) => step.name),
  [
    'validate service launch boundary registry',
    'validate direct backend spawn guard index',
    'validate solo-local release gate matrix',
    'validate release boundary mandatory artifacts',
    'run Godot release export wrapper',
    'generate AI subject release boundary manifest',
    'validate generated server release artifact',
    'validate generated client package manifest',
    'validate AI subject release boundary manifest',
    'validate gameplay anchor registry',
    'validate ops secret restore recovery checklist',
    'verify release artifact drift is clean',
    'scan saved Godot release export logs',
  ],
)

assert.deepEqual(steps[0], {
  name: 'validate service launch boundary registry',
  command: 'npm',
  args: ['run', 'test:service-launch-boundary-registry-stage834-contract'],
})
assert.deepEqual(steps[1], {
  name: 'validate direct backend spawn guard index',
  command: 'npm',
  args: ['run', 'service:direct-backend-spawn-guard:check', '--', '--profile', 'local-dev'],
})
assert.deepEqual(steps[2], {
  name: 'validate solo-local release gate matrix',
  command: 'npm',
  args: ['run', 'release:solo-local-gate-matrix:check', '--', '--profile', 'local-dev'],
})
assert.deepEqual(steps[3], {
  name: 'validate release boundary mandatory artifacts',
  command: 'npm',
  args: ['run', 'release:boundary-artifacts:check', '--', '--profile', 'local-dev'],
})
assert.deepEqual(steps[4], {
  name: 'run Godot release export wrapper',
  command: 'npm',
  args: ['run', 'godot:release:export', '--', '--profile', 'local-dev'],
})
assert.deepEqual(steps[5], {
  name: 'generate AI subject release boundary manifest',
  command: 'npm',
  args: ['run', 'generate:ai-subject-release-boundary', '--', '--profile', 'local-dev'],
})
assert.deepEqual(steps[6], {
  name: 'validate generated server release artifact',
  command: 'npm',
  args: ['run', 'test:server-release-artifact-generation-contract'],
})
assert.deepEqual(steps[7], {
  name: 'validate generated client package manifest',
  command: 'npm',
  args: ['run', 'test:client-package-manifest-generation-contract'],
})
assert.deepEqual(steps[8], {
  name: 'validate AI subject release boundary manifest',
  command: 'npm',
  args: ['run', 'test:ai-subject-release-boundary-manifest-contract'],
})
assert.deepEqual(steps[9], {
  name: 'validate gameplay anchor registry',
  command: 'npm',
  args: ['run', 'test:gameplay-anchor-registry-stage829-contract'],
})
assert.deepEqual(steps[10], {
  name: 'validate ops secret restore recovery checklist',
  command: 'npm',
  args: ['run', 'release:ops:check', '--', '--profile', 'local-dev'],
})
assert.deepEqual(steps[11], {
  name: 'verify release artifact drift is clean',
  command: 'npm',
  args: ['run', 'release:artifact-drift:check', '--', '--profile', 'local-dev'],
})
assert.deepEqual(steps[12], {
  name: 'scan saved Godot release export logs',
  command: 'npm',
  args: ['run', 'release:export-hygiene:scan'],
})

const exportLine = shellLineForReleaseCandidateGateStep(steps[3])
assert.ok(
  exportLine.includes('release:boundary-artifacts:check') && exportLine.includes('--profile local-dev'),
  'release candidate gate must run the mandatory artifact check after the solo/local matrix',
)

const godotExportLine = shellLineForReleaseCandidateGateStep(steps[4])
assert.ok(
  godotExportLine.includes('godot:release:export') && godotExportLine.includes('--profile local-dev'),
  'release candidate gate must reuse the formal Godot export wrapper instead of calling Godot directly',
)

const packageJson = readFileSync('package.json', 'utf8')
assert.ok(
  packageJson.includes('"release:candidate": "tsx scripts/run_release_candidate_gate.ts"'),
  'package.json must expose a generic release:candidate entry',
)
assert.ok(
  packageJson.includes('"release:candidate:local-dev": "tsx scripts/run_release_candidate_gate.ts --profile local-dev"'),
  'package.json must expose a fixed local-dev release candidate entry',
)
assert.ok(
  packageJson.includes('"release:export-hygiene:scan": "tsx scripts/validate_godot_release_export_hygiene.ts --log tmp/godot_release_export_stdout.log --log tmp/godot_release_export_stderr.log"'),
  'package.json must expose the saved release export log scan as a reusable formal entry',
)
assert.ok(
  packageJson.includes('"generate:ai-subject-release-boundary": "tsx scripts/generate_ai_subject_release_boundary.ts"'),
  'package.json must expose the AI subject boundary manifest generator',
)
assert.ok(
  packageJson.includes('"test:ai-subject-release-boundary-manifest-contract": "tsx server/tests/ai_subject_release_boundary_manifest_contract.test.ts"'),
  'package.json must expose the AI subject boundary manifest contract',
)
assert.ok(
  packageJson.includes('"test:gameplay-anchor-registry-stage829-contract": "tsx server/tests/gameplay_anchor_registry_stage829_contract.test.ts"'),
  'package.json must expose the gameplay anchor registry contract',
)
assert.ok(
  packageJson.includes('"test:service-launch-boundary-registry-stage834-contract": "tsx server/tests/service_launch_boundary_registry_stage834_contract.test.ts"'),
  'package.json must expose the service launch boundary registry contract',
)
assert.ok(
  packageJson.includes('"release:boundary-artifacts:check": "tsx scripts/validate_release_boundary_mandatory_artifacts.ts"'),
  'package.json must expose the release boundary mandatory artifact validator',
)
assert.ok(
  packageJson.includes('"service:direct-backend-spawn-guard:check": "tsx scripts/validate_direct_backend_spawn_guard_index.ts"'),
  'package.json must expose the direct backend spawn guard validator',
)
assert.ok(
  packageJson.includes('"release:solo-local-gate-matrix:check": "tsx scripts/validate_release_solo_local_gate_matrix.ts"'),
  'package.json must expose the solo/local release gate matrix validator',
)
assert.ok(
  packageJson.includes('"release:ops:check": "tsx scripts/validate_ops_release_checklist.ts"'),
  'package.json must expose the ops release checklist validator',
)
assert.ok(
  packageJson.includes('"release:artifact-drift:check": "tsx scripts/verify_release_artifact_drift.ts"'),
  'package.json must expose the release artifact drift gate',
)
assert.ok(
  packageJson.includes('"ci:release-candidate:local-dev": "npm run release:candidate:local-dev --"'),
  'package.json must expose a CI release candidate alias that reuses the formal chain and preserves passthrough args',
)
assert.ok(
  packageJson.includes('"release:preflight:local-dev": "npm run release:candidate:local-dev --"'),
  'package.json must expose a pre-release alias that reuses the formal chain and preserves passthrough args',
)
assert.ok(
  packageJson.includes('"test:ops-release-checklist-contract": "tsx server/tests/ops_release_checklist_contract.test.ts"'),
  'package.json must expose the ops release checklist contract',
)
assert.ok(
  packageJson.includes('"test:release-artifact-drift-gate-contract": "tsx server/tests/release_artifact_drift_gate_contract.test.ts"'),
  'package.json must expose the release artifact drift gate contract',
)
assert.ok(
  packageJson.includes('"test:release-candidate-gate-contract": "tsx server/tests/release_candidate_gate_contract.test.ts"'),
  'package.json must expose the release candidate gate contract',
)

console.log('[release_candidate_gate_contract] all checks passed')
