import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

function assertBefore(source: string, before: string, after: string, label: string): void {
  const beforeIndex = source.indexOf(before)
  const afterIndex = source.indexOf(after)
  assert.ok(beforeIndex >= 0, `${label} must include ${before}`)
  assert.ok(afterIndex >= 0, `${label} must include ${after}`)
  assert.ok(beforeIndex < afterIndex, `${label} must run ${before} before ${after}`)
}

const packageJson = JSON.parse(readUtf8('package.json'))
const scriptPath = 'scripts/check_8989_service_processes.ts'
const visualSmokePath = 'godot-client/tools/run_mainline_visual_smoke.py'
const backendHarnessPath = 'server/tests/helpers/backendHarness.ts'
const localGatePrestartGuardPath = 'server/src/ops/serviceProcessPrestartGuard.ts'
const sessionSecurityGatePath = 'server/src/evals/runSessionSecurityGate.ts'
const directLaunchTsPaths = [
  'server/src/ops/prepareWorldSeasonCutover.ts',
  'server/src/evals/runWorldSeasonConfigVerifyGate.ts',
  'server/src/evals/runWorldNewSeasonReseedDryRunGate.ts',
] as const
const directLaunchPythonPaths = [
  'scripts/capture_world_cell_live_nodes_with_backend.py',
  'scripts/run_strategic_node_zoom_hit_capture_gate.py',
] as const

assert.equal(
  packageJson.scripts?.['test:service-process-preflight-guard-contract'],
  'tsx server/tests/service_process_preflight_guard_contract.test.ts',
  'package.json must expose the service process preflight guard contract',
)
assert.equal(
  packageJson.scripts?.['ops:service-process-guard'],
  'tsx scripts/check_8989_service_processes.ts --max-server-groups 1',
  'package.json must expose a non-destructive 8989 service process guard',
)
assert.equal(
  packageJson.scripts?.['ops:service-process-prestart'],
  'tsx scripts/check_8989_service_processes.ts --max-server-groups 0',
  'package.json must expose a strict prestart guard that blocks duplicate service launches',
)
assert.equal(
  packageJson.scripts?.['ops:service-process-cleanup-older'],
  'tsx scripts/check_8989_service_processes.ts --cleanup-older --max-server-groups 1',
  'package.json must expose an older duplicate cleanup command',
)
assert.equal(
  packageJson.scripts?.['ops:service-process-cleanup-all'],
  'tsx scripts/check_8989_service_processes.ts --cleanup-all',
  'package.json must expose an explicit all-service cleanup command',
)

for (const [scriptName, prestartName] of [
  ['start', 'prestart'],
  ['start:world-layout:full', 'prestart:world-layout:full'],
  ['start:clock', 'prestart:clock'],
  ['server:dev', 'preserver:dev'],
] as const) {
  assertIncludes(packageJson.scripts?.[scriptName] ?? '', 'server/src/app.ts', `${scriptName} service entry`)
  assert.equal(
    packageJson.scripts?.[prestartName],
    'npm run ops:service-process-prestart',
    `${scriptName} must run the strict prestart service guard before launching`,
  )
}

assert.ok(existsSync(scriptPath), `missing service process guard script: ${scriptPath}`)
const script = readUtf8(scriptPath)
const visualSmoke = readUtf8(visualSmokePath)
const backendHarness = readUtf8(backendHarnessPath)
const localGatePrestartGuard = readUtf8(localGatePrestartGuardPath)
const sessionSecurityGate = readUtf8(sessionSecurityGatePath)

for (const token of [
  'Get-CimInstance Win32_Process',
  'Stop-Process',
  'server/src/app.ts',
  'server:dev',
  'tsx',
  'watch',
  'node_repl',
  '--cleanup-older',
  '--cleanup-all',
  'tmpCleanableItems',
  'latestKeptProcessIds',
]) {
  assertIncludes(script, token, 'service process guard script')
}

for (const token of [
  'def _run_service_process_prestart_guard(',
  'ops:service-process-prestart',
  'service_process_prestart_failed',
  'def _spawn_backend(',
]) {
  assertIncludes(visualSmoke, token, 'Godot mainline visual smoke service launch guard')
}
const spawnBackendSource = visualSmoke.slice(
  visualSmoke.indexOf('def _spawn_backend('),
  visualSmoke.indexOf('def _terminate('),
)
assertBefore(
  spawnBackendSource,
  '_run_service_process_prestart_guard(log_path)',
  'subprocess.Popen(',
  'Godot mainline visual smoke backend launch guard',
)

for (const token of [
  'activeBackendChildren',
  'registerBackendHarnessCleanupHooks()',
  'killHarnessChildrenSync()',
  "process.once('exit', killHarnessChildrenSync)",
  "process.once('SIGINT'",
  "process.once('SIGTERM'",
  "SLG_TEST_HARNESS_BACKEND: '1'",
  "child.once('exit', () => activeBackendChildren.delete(child))",
  'activeBackendChildren.delete(child)',
]) {
  assertIncludes(backendHarness, token, 'backendHarness service lifecycle cleanup guard')
}
const backendSpawnSource = backendHarness.slice(
  backendHarness.indexOf('export function spawnBackend('),
  backendHarness.indexOf('export async function requestJson('),
)
assertBefore(
  backendSpawnSource,
  'registerBackendHarnessCleanupHooks()',
  "spawn(process.execPath, ['--import', 'tsx', 'server/src/app.ts']",
  'backendHarness service lifecycle cleanup guard',
)

for (const token of [
  'export function runServiceProcessPrestartGuard(',
  'npm.cmd',
  'ops:service-process-prestart',
  'service process prestart guard failed before',
]) {
  assertIncludes(localGatePrestartGuard, token, 'local gate service prestart guard helper')
}

for (const path of directLaunchTsPaths) {
  const source = readUtf8(path)
  for (const token of [
    'runServiceProcessPrestartGuard',
    'SLG_LOCAL_GATE_BACKEND',
    "spawn(process.execPath, ['--import', 'tsx', 'server/src/app.ts']",
  ]) {
    assertIncludes(source, token, `${path} direct local gate backend guard`)
  }
  const spawnSource = source.slice(source.indexOf('function spawnBackend('), source.indexOf('async function waitForHealth('))
  assertBefore(
    spawnSource,
    'runServiceProcessPrestartGuard(',
    "spawn(process.execPath, ['--import', 'tsx', 'server/src/app.ts']",
    `${path} direct local gate backend guard`,
  )
}

for (const path of directLaunchPythonPaths) {
  const source = readUtf8(path)
  for (const token of [
    'def _run_service_process_prestart_guard(',
    'ops:service-process-prestart',
    'service_process_prestart_failed',
    'SLG_LOCAL_GATE_BACKEND',
    'backend = subprocess.Popen(',
  ]) {
    assertIncludes(source, token, `${path} direct local gate backend guard`)
  }
  assertBefore(
    source,
    '_run_service_process_prestart_guard(stdout_file)',
    'backend = subprocess.Popen(',
    `${path} direct local gate backend guard`,
  )
}

for (const token of [
  'function stopBackendChild(',
  "SLG_LOCAL_GATE_BACKEND: '1'",
  "'run', 'start'",
  'finally {',
  'stopBackendChild(child)',
  'process.exitCode = passed ? 0 : 1',
]) {
  assertIncludes(sessionSecurityGate, token, 'session security npm start gate cleanup guard')
}
assertBefore(
  sessionSecurityGate,
  "SLG_LOCAL_GATE_BACKEND: '1'",
  "spawn(process.execPath, [npmExecPath, 'run', 'start']",
  'session security npm start gate local backend marker',
)
assertBefore(
  sessionSecurityGate,
  'finally {',
  'stopBackendChild(child)',
  'session security npm start gate cleanup guard',
)

const megaPlan = readUtf8('docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md')
for (const token of [
  'npm.cmd run ops:service-process-guard',
  'npm.cmd run ops:service-process-prestart',
  'npm.cmd run ops:service-process-cleanup-older',
  'SLG_LOCAL_GATE_BACKEND=1',
  '`npm run start` local gates',
  'Before any command that can start server:dev, tsx watch, or a smoke backend',
  '--max-server-groups 0',
  'tmp/ cleanable items',
]) {
  assertIncludes(megaPlan, token, 'Stage 814 mega plan service guard')
}

const current = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const token of [
  'npm.cmd run test:service-process-preflight-guard-contract',
  'npm.cmd run ops:service-process-guard',
  'npm.cmd run ops:service-process-prestart',
  'prestart duplicate-launch guard',
  'Stage 822C - Direct Local Gate Backend Prestart Guard',
  'Stage 822D - Npm Start Gate Cleanup Guard',
  'SLG_LOCAL_GATE_BACKEND=1',
  '`gate:session:security`',
  'tmp/stage815_facility_upgrade_probe',
  'service process cleanup',
]) {
  assertIncludes(current, token, 'CURRENT service process guard record')
}
