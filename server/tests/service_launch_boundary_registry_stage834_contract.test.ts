import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}
const scripts = packageJson.scripts ?? {}

assert.equal(
  scripts['test:service-launch-boundary-registry-stage834-contract'],
  'tsx server/tests/service_launch_boundary_registry_stage834_contract.test.ts',
  'package.json must expose the Stage 834 service launch boundary registry contract',
)

const registryPath = 'ops/release-artifacts/local-dev.service-launch-boundary-registry.json'
assert.ok(existsSync(registryPath), `missing service launch boundary registry: ${registryPath}`)

const registry = JSON.parse(readUtf8(registryPath)) as {
  status: string
  profileId: string
  manualPreflightCommand: string
  strictPrestartCommand: string
  cleanupOlderCommand: string
  cleanupAllCommand: string
  duplicateLaunchAllowed: boolean
  groups: {
    directServerEntrypoints: string[]
    godotCurrentBackendEntrypoints: string[]
    manualGodotRuntimeEntrypoints: string[]
  }
  guardedImplementations: string[]
  nonClaims: string[]
}

assert.equal(registry.status, 'current Stage 834 service launch boundary registry')
assert.equal(registry.profileId, 'local-dev')
assert.equal(registry.manualPreflightCommand, 'npm.cmd run ops:service-process-guard')
assert.equal(registry.strictPrestartCommand, 'npm.cmd run ops:service-process-prestart')
assert.equal(registry.cleanupOlderCommand, 'npm.cmd run ops:service-process-cleanup-older')
assert.equal(registry.cleanupAllCommand, 'npm.cmd run ops:service-process-cleanup-all')
assert.equal(registry.duplicateLaunchAllowed, false)

const directServerEntrypoints = Object.entries(scripts)
  .filter(([, command]) => command.includes('server/src/app.ts'))
  .map(([name]) => name)
  .filter((name) => !name.startsWith('pre') && !name.startsWith('ops:'))
  .sort()
assert.deepEqual(
  registry.groups.directServerEntrypoints.slice().sort(),
  directServerEntrypoints,
  'registry must classify every npm script that directly starts server/src/app.ts',
)
for (const scriptName of registry.groups.directServerEntrypoints) {
  const prestartName = `pre${scriptName}`
  assert.equal(
    scripts[prestartName],
    'npm run ops:service-process-prestart',
    `${scriptName} must have an npm lifecycle prestart guard`,
  )
}

const godotCurrentBackendEntrypoints = Object.entries(scripts)
  .filter(([name, command]) => name.includes('current-backend') || command.includes('capture_world_cell_live_nodes_with_backend.py'))
  .map(([name]) => name)
  .sort()
assert.deepEqual(
  registry.groups.godotCurrentBackendEntrypoints.slice().sort(),
  godotCurrentBackendEntrypoints,
  'registry must classify every Godot current-backend npm entrypoint',
)
for (const scriptName of registry.groups.godotCurrentBackendEntrypoints) {
  assert.ok(
    scripts[scriptName]?.includes('capture_world_cell_live_nodes_with_backend.py'),
    `${scriptName} must use the backend-guarded capture runner`,
  )
}

assert.deepEqual(registry.groups.manualGodotRuntimeEntrypoints.slice().sort(), [
  'dev:godot:play',
  'godot:headless:smoke',
  'godot:mainline:dev',
  'godot:mainline:runtime',
])

for (const requiredImplementation of [
  'server/tests/service_process_preflight_guard_contract.test.ts',
  'godot-client/tools/run_mainline_visual_smoke.py',
  'scripts/capture_world_cell_live_nodes_with_backend.py',
  'scripts/run_strategic_node_zoom_hit_capture_gate.py',
  'server/tests/helpers/backendHarness.ts',
  'server/src/ops/serviceProcessPrestartGuard.ts',
]) {
  assert.ok(
    registry.guardedImplementations.includes(requiredImplementation),
    `registry must cite guarded implementation: ${requiredImplementation}`,
  )
}

for (const nonClaim of [
  'no service is started by this registry',
  'manual Godot launch commands still require human preflight before use',
  'tmp evidence cleanup remains dry-run-only by default',
]) {
  assert.ok(registry.nonClaims.includes(nonClaim), `registry must include non-claim: ${nonClaim}`)
}

const current = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const token of [
  'Stage 834 - Service Launch Boundary Registry Guard',
  registryPath,
  'does not start `server:dev`, `tsx watch`, Godot runtime, or smoke backends',
]) {
  assert.ok(current.includes(token), `CURRENT handoff must include ${token}`)
}

const progress = JSON.parse(readUtf8('ops/release-artifacts/local-dev.boundary-convergence-progress.json')) as {
  completedStages: Array<{ stageId: number | string; status: string; evidence: string[] }>
  mandatoryGuards: string[]
}
const stage834 = progress.completedStages.find((stage) => stage.stageId === 834)
assert.ok(stage834, 'Stage 826 progress manifest must record Stage 834')
assert.equal(stage834.status, 'formal-green-static-service-launch-registry')
assert.ok(stage834.evidence.includes(registryPath))
assert.ok(
  progress.mandatoryGuards.includes('service_launch_boundary_registry_guard'),
  'Stage 826 progress manifest must require the service launch boundary registry guard',
)

console.log('[service_launch_boundary_registry_stage834_contract] all checks passed')
