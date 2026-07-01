import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const DEFAULT_DIRECT_BACKEND_SPAWN_GUARD_PROFILE = 'local-dev'
export const DEFAULT_DIRECT_BACKEND_SPAWN_GUARD_INDEX_PATH =
  'ops/release-artifacts/local-dev.direct-backend-spawn-guard-index.json'

type GuardedDirectSpawnEntry = {
  path: string
  guardToken: string
  spawnToken: string
  localBackendMarker: string
}

type NpmStartLocalGateSpawnEntry = {
  path: string
  markerToken: string
  spawnToken: string
  cleanupToken: string
}

type TestHarnessBackendSpawnEntry = {
  path: string
  markerToken: string
  spawnToken: string
  cleanupTokens: string[]
}

type DirectBackendSpawnGuardIndex = {
  status: string
  profileId: string
  manualPreflightCommand: string
  strictPrestartCommand: string
  duplicateLaunchAllowed: boolean
  guardedSpawnGroups: {
    directLocalGateBackendSpawns: GuardedDirectSpawnEntry[]
    visualSmokeBackendSpawns: GuardedDirectSpawnEntry[]
    npmStartLocalGateSpawns: NpmStartLocalGateSpawnEntry[]
    testHarnessBackendSpawns: TestHarnessBackendSpawnEntry[]
  }
  nonClaims: string[]
}

export type DirectBackendSpawnGuardOptions = {
  profileId: string
}

export type DirectBackendSpawnGuardResult = {
  profileId: string
  ok: boolean
  errors: string[]
}

const EXPECTED_DIRECT_LOCAL_GATE_PATHS = [
  'server/src/ops/prepareWorldSeasonCutover.ts',
  'server/src/evals/runWorldSeasonConfigVerifyGate.ts',
  'server/src/evals/runWorldNewSeasonReseedDryRunGate.ts',
  'scripts/capture_world_cell_live_nodes_with_backend.py',
  'scripts/run_strategic_node_zoom_hit_capture_gate.py',
] as const

const EXPECTED_VISUAL_SMOKE_PATHS = ['godot-client/tools/run_mainline_visual_smoke.py'] as const
const EXPECTED_NPM_START_GATE_PATHS = ['server/src/evals/runSessionSecurityGate.ts'] as const
const EXPECTED_TEST_HARNESS_PATHS = ['server/tests/helpers/backendHarness.ts'] as const

const REQUIRED_NON_CLAIMS = [
  'no backend service is started by this index',
  'test harness backend spawns remain test-only and require cleanup hooks',
  'manual Godot runtime commands still require human preflight before use',
] as const

export function parseDirectBackendSpawnGuardArgs(argv: string[]): DirectBackendSpawnGuardOptions {
  let profileId = DEFAULT_DIRECT_BACKEND_SPAWN_GUARD_PROFILE
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--profile') {
      profileId = argv[index + 1] ?? ''
      index += 1
      continue
    }
    if (arg.startsWith('--profile=')) {
      profileId = arg.slice('--profile='.length)
      continue
    }
    throw new Error(`unknown direct backend spawn guard argument: ${arg}`)
  }
  return { profileId: normalizeProfileId(profileId) }
}

export function directBackendSpawnGuardIndexPath(profileId: string): string {
  const normalized = normalizeProfileId(profileId)
  if (normalized === DEFAULT_DIRECT_BACKEND_SPAWN_GUARD_PROFILE) {
    return DEFAULT_DIRECT_BACKEND_SPAWN_GUARD_INDEX_PATH
  }
  return `ops/release-artifacts/${normalized}.direct-backend-spawn-guard-index.json`
}

export function validateDirectBackendSpawnGuardIndex(
  options: DirectBackendSpawnGuardOptions,
): DirectBackendSpawnGuardResult {
  const profileId = normalizeProfileId(options.profileId)
  const indexPath = directBackendSpawnGuardIndexPath(profileId)
  const errors: string[] = []

  if (!existsSync(indexPath)) {
    return {
      profileId,
      ok: false,
      errors: [`direct backend spawn guard index missing: ${indexPath}`],
    }
  }

  const index = JSON.parse(readFileSync(indexPath, 'utf8')) as DirectBackendSpawnGuardIndex
  if (index.status !== 'current Stage 840 direct backend spawn guard index') {
    errors.push('index status is not current Stage 840 direct backend spawn guard index')
  }
  if (index.profileId !== profileId) {
    errors.push(`index profileId mismatch: ${index.profileId}`)
  }
  if (index.manualPreflightCommand !== 'npm.cmd run ops:service-process-guard') {
    errors.push('manualPreflightCommand mismatch')
  }
  if (index.strictPrestartCommand !== 'npm.cmd run ops:service-process-prestart') {
    errors.push('strictPrestartCommand mismatch')
  }
  if (index.duplicateLaunchAllowed !== false) {
    errors.push('duplicateLaunchAllowed must be false')
  }

  expectPaths(
    index.guardedSpawnGroups.directLocalGateBackendSpawns.map((entry) => entry.path),
    EXPECTED_DIRECT_LOCAL_GATE_PATHS,
    'directLocalGateBackendSpawns',
    errors,
  )
  expectPaths(
    index.guardedSpawnGroups.visualSmokeBackendSpawns.map((entry) => entry.path),
    EXPECTED_VISUAL_SMOKE_PATHS,
    'visualSmokeBackendSpawns',
    errors,
  )
  expectPaths(
    index.guardedSpawnGroups.npmStartLocalGateSpawns.map((entry) => entry.path),
    EXPECTED_NPM_START_GATE_PATHS,
    'npmStartLocalGateSpawns',
    errors,
  )
  expectPaths(
    index.guardedSpawnGroups.testHarnessBackendSpawns.map((entry) => entry.path),
    EXPECTED_TEST_HARNESS_PATHS,
    'testHarnessBackendSpawns',
    errors,
  )

  for (const entry of [
    ...index.guardedSpawnGroups.directLocalGateBackendSpawns,
    ...index.guardedSpawnGroups.visualSmokeBackendSpawns,
  ]) {
    validateGuardedDirectSpawnEntry(entry, errors)
  }
  for (const entry of index.guardedSpawnGroups.npmStartLocalGateSpawns) {
    validateNpmStartEntry(entry, errors)
  }
  for (const entry of index.guardedSpawnGroups.testHarnessBackendSpawns) {
    validateTestHarnessEntry(entry, errors)
  }

  for (const nonClaim of REQUIRED_NON_CLAIMS) {
    if (!index.nonClaims.includes(nonClaim)) {
      errors.push(`missing non-claim: ${nonClaim}`)
    }
  }

  return {
    profileId,
    ok: errors.length === 0,
    errors,
  }
}

function validateGuardedDirectSpawnEntry(entry: GuardedDirectSpawnEntry, errors: string[]): void {
  const source = readEntrySource(entry.path, errors)
  if (!source) return
  requireIncludes(source, entry.localBackendMarker, entry.path, errors)
  requireBefore(source, entry.guardToken, entry.spawnToken, entry.path, errors)
}

function validateNpmStartEntry(entry: NpmStartLocalGateSpawnEntry, errors: string[]): void {
  const source = readEntrySource(entry.path, errors)
  if (!source) return
  requireIncludes(source, entry.markerToken, entry.path, errors)
  requireIncludes(source, entry.spawnToken, entry.path, errors)
  requireIncludes(source, entry.cleanupToken, entry.path, errors)
  requireIncludes(readFileSync('package.json', 'utf8'), '"prestart": "npm run ops:service-process-prestart"', 'package.json', errors)
}

function validateTestHarnessEntry(entry: TestHarnessBackendSpawnEntry, errors: string[]): void {
  const source = readEntrySource(entry.path, errors)
  if (!source) return
  requireIncludes(source, entry.markerToken, entry.path, errors)
  requireIncludes(source, entry.spawnToken, entry.path, errors)
  for (const cleanupToken of entry.cleanupTokens) {
    requireIncludes(source, cleanupToken, entry.path, errors)
  }
}

function readEntrySource(path: string, errors: string[]): string | null {
  if (!existsSync(path)) {
    errors.push(`guarded spawn source missing: ${path}`)
    return null
  }
  return readFileSync(path, 'utf8')
}

function requireIncludes(source: string, token: string, label: string, errors: string[]): void {
  if (!source.includes(token)) {
    errors.push(`${label} must include ${token}`)
  }
}

function requireBefore(source: string, before: string, after: string, label: string, errors: string[]): void {
  const beforeIndex = source.indexOf(before)
  const afterIndex = source.indexOf(after)
  if (beforeIndex < 0) {
    errors.push(`${label} must include ${before}`)
    return
  }
  if (afterIndex < 0) {
    errors.push(`${label} must include ${after}`)
    return
  }
  if (beforeIndex >= afterIndex) {
    errors.push(`${label} must run ${before} before ${after}`)
  }
}

function expectPaths(actual: string[], expected: readonly string[], label: string, errors: string[]): void {
  const actualSorted = actual.slice().sort()
  const expectedSorted = expected.slice().sort()
  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
    errors.push(`${label} path mismatch: ${actualSorted.join(', ')}`)
  }
}

function normalizeProfileId(profileId: string): string {
  const normalized = profileId.trim() || DEFAULT_DIRECT_BACKEND_SPAWN_GUARD_PROFILE
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`invalid direct backend spawn guard profile id: ${profileId}`)
  }
  return normalized
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try {
    const result = validateDirectBackendSpawnGuardIndex(
      parseDirectBackendSpawnGuardArgs(process.argv.slice(2)),
    )
    if (!result.ok) {
      throw new Error(`direct backend spawn guard index invalid: ${result.errors.join('; ')}`)
    }
    console.log(`[direct-backend-spawn-guard] ${result.profileId} ok`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
