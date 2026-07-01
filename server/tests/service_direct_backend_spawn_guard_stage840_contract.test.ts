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

const indexPath = 'ops/release-artifacts/local-dev.direct-backend-spawn-guard-index.json'
const checklistPath = 'ops/release-artifacts/local-dev.release-boundary-mandatory-artifacts.json'
const stage840Guard = 'direct_backend_spawn_guard_index_guard'

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['service:direct-backend-spawn-guard:check'],
  'tsx scripts/validate_direct_backend_spawn_guard_index.ts',
  'package.json must expose the direct backend spawn guard validator',
)
assert.equal(
  packageJson.scripts?.['test:service-direct-backend-spawn-guard-stage840-contract'],
  'tsx server/tests/service_direct_backend_spawn_guard_stage840_contract.test.ts',
  'package.json must expose the Stage 840 direct backend spawn guard contract',
)

assert.ok(existsSync(indexPath), `missing direct backend spawn guard index: ${indexPath}`)

const index = JSON.parse(readUtf8(indexPath)) as {
  status: string
  profileId: string
  manualPreflightCommand: string
  strictPrestartCommand: string
  duplicateLaunchAllowed: boolean
  guardedSpawnGroups: {
    directLocalGateBackendSpawns: Array<{
      path: string
      guardToken: string
      spawnToken: string
      localBackendMarker: string
    }>
    visualSmokeBackendSpawns: Array<{
      path: string
      guardToken: string
      spawnToken: string
      localBackendMarker: string
    }>
    npmStartLocalGateSpawns: Array<{
      path: string
      markerToken: string
      spawnToken: string
      cleanupToken: string
    }>
    testHarnessBackendSpawns: Array<{
      path: string
      markerToken: string
      spawnToken: string
      cleanupTokens: string[]
    }>
  }
  nonClaims: string[]
}

assert.equal(index.status, 'current Stage 840 direct backend spawn guard index')
assert.equal(index.profileId, 'local-dev')
assert.equal(index.manualPreflightCommand, 'npm.cmd run ops:service-process-guard')
assert.equal(index.strictPrestartCommand, 'npm.cmd run ops:service-process-prestart')
assert.equal(index.duplicateLaunchAllowed, false)

assert.deepEqual(
  index.guardedSpawnGroups.directLocalGateBackendSpawns.map((entry) => entry.path).sort(),
  [
    'scripts/capture_world_cell_live_nodes_with_backend.py',
    'scripts/run_strategic_node_zoom_hit_capture_gate.py',
    'server/src/evals/runWorldNewSeasonReseedDryRunGate.ts',
    'server/src/evals/runWorldSeasonConfigVerifyGate.ts',
    'server/src/ops/prepareWorldSeasonCutover.ts',
  ],
)
assert.deepEqual(index.guardedSpawnGroups.visualSmokeBackendSpawns.map((entry) => entry.path), [
  'godot-client/tools/run_mainline_visual_smoke.py',
])
assert.deepEqual(index.guardedSpawnGroups.npmStartLocalGateSpawns.map((entry) => entry.path), [
  'server/src/evals/runSessionSecurityGate.ts',
])
assert.deepEqual(index.guardedSpawnGroups.testHarnessBackendSpawns.map((entry) => entry.path), [
  'server/tests/helpers/backendHarness.ts',
])

for (const entry of [
  ...index.guardedSpawnGroups.directLocalGateBackendSpawns,
  ...index.guardedSpawnGroups.visualSmokeBackendSpawns,
]) {
  const source = readUtf8(entry.path)
  assertIncludes(source, entry.localBackendMarker, entry.path)
  assertBefore(source, entry.guardToken, entry.spawnToken, entry.path)
}

for (const entry of index.guardedSpawnGroups.npmStartLocalGateSpawns) {
  const source = readUtf8(entry.path)
  assertIncludes(source, entry.markerToken, entry.path)
  assertIncludes(source, entry.spawnToken, entry.path)
  assertIncludes(source, entry.cleanupToken, entry.path)
  assertIncludes(readUtf8('package.json'), '"prestart": "npm run ops:service-process-prestart"', 'package prestart')
}

for (const entry of index.guardedSpawnGroups.testHarnessBackendSpawns) {
  const source = readUtf8(entry.path)
  assertIncludes(source, entry.markerToken, entry.path)
  assertIncludes(source, entry.spawnToken, entry.path)
  for (const cleanupToken of entry.cleanupTokens) {
    assertIncludes(source, cleanupToken, entry.path)
  }
}

for (const nonClaim of [
  'no backend service is started by this index',
  'test harness backend spawns remain test-only and require cleanup hooks',
  'manual Godot runtime commands still require human preflight before use',
]) {
  assert.ok(index.nonClaims.includes(nonClaim), `missing non-claim: ${nonClaim}`)
}

const checklist = readUtf8(checklistPath)
assertIncludes(checklist, 'direct_backend_spawn_guard_index', 'mandatory artifact checklist')
assertIncludes(checklist, indexPath, 'mandatory artifact checklist')

const validator = readUtf8('scripts/validate_direct_backend_spawn_guard_index.ts')
assertIncludes(validator, indexPath, 'direct backend spawn validator')
assertIncludes(validator, 'directLocalGateBackendSpawns', 'direct backend spawn validator')

const workflow = readUtf8('.github/workflows/release-candidate-boundary-gate.yml')
assertIncludes(workflow, 'directBackendSpawnGuardIndex', 'release candidate workflow')
assertIncludes(workflow, indexPath, 'release candidate workflow')

const archiveDoc = readUtf8('docs/RELEASE_CANDIDATE_GITHUB_ACTIONS_RUN_ARCHIVE_CURRENT_2026_06_16.md')
assertIncludes(archiveDoc, indexPath, 'GitHub archive doc')
assertIncludes(archiveDoc, 'direct backend spawn guard index', 'GitHub archive doc')

const current = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const token of [
  'Stage 840 - Direct Backend Spawn Guard Index',
  indexPath,
  'does not start `server:dev`, `tsx watch`, Godot runtime, or smoke backends',
]) {
  assertIncludes(current, token, 'CURRENT handoff')
}

const progress = JSON.parse(readUtf8('ops/release-artifacts/local-dev.boundary-convergence-progress.json')) as {
  completedStages: Array<{ stageId: number | string; status: string; evidence: string[] }>
  mandatoryGuards: string[]
}
const stage840 = progress.completedStages.find((stage) => stage.stageId === 840)
assert.ok(stage840, 'Stage 826 progress manifest must record Stage 840')
assert.equal(stage840.status, 'formal-green-static-direct-backend-spawn-guard-index')
assert.ok(stage840.evidence.includes(indexPath))
assert.ok(
  progress.mandatoryGuards.includes(stage840Guard),
  'Stage 826 progress manifest must require the Stage 840 direct backend spawn guard',
)

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 840', 'split target')
assertIncludes(splitTarget, 'directBackendSpawnGuardIndex', 'split target')

const megaPlan = readUtf8('docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md')
assertIncludes(megaPlan, 'Stage 840', 'mega plan')
assertIncludes(megaPlan, stage840Guard, 'mega plan')
