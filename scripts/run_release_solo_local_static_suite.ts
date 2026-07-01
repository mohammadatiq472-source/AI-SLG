import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const DEFAULT_RELEASE_SOLO_LOCAL_STATIC_SUITE_PROFILE = 'local-dev'
export const DEFAULT_RELEASE_SOLO_LOCAL_STATIC_SUITE_PATH =
  'ops/release-artifacts/local-dev.solo-local-static-suite.json'

export type ReleaseSoloLocalStaticSuiteOptions = {
  profileId: string
  dryRun: boolean
}

export type ReleaseSoloLocalStaticSuiteStep = {
  gateId: string
  command: 'npm'
  args: string[]
  startsService: boolean
  requiresHostedEvidence: boolean
  requiresStagingProdEndpoint: boolean
}

type ReleaseSoloLocalStaticSuiteManifest = {
  status: string
  profileId: string
  suiteCommand: string
  nonStarting: boolean
  sourceMatrix: string
  steps: Array<{
    index: number
    gateId: string
    command: string
    startsService: boolean
    requiresHostedEvidence: boolean
    requiresStagingProdEndpoint: boolean
  }>
  nonClaims: string[]
}

const REQUIRED_NON_CLAIMS = [
  'does not run release:candidate:local-dev',
  'does not run Godot export',
  'does not claim hosted GitHub Actions run evidence',
  'does not treat Stage 846 local replay as hosted evidence',
  'does not start server:dev or tsx watch',
] as const

export function parseReleaseSoloLocalStaticSuiteArgs(argv: string[]): ReleaseSoloLocalStaticSuiteOptions {
  const options: ReleaseSoloLocalStaticSuiteOptions = {
    profileId: DEFAULT_RELEASE_SOLO_LOCAL_STATIC_SUITE_PROFILE,
    dryRun: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') {
      options.dryRun = true
      continue
    }
    if (arg === '--profile') {
      options.profileId = argv[index + 1] ?? ''
      index += 1
      continue
    }
    if (arg.startsWith('--profile=')) {
      options.profileId = arg.slice('--profile='.length)
      continue
    }
    throw new Error(`unknown release solo/local static suite argument: ${arg}`)
  }
  return {
    profileId: normalizeProfileId(options.profileId),
    dryRun: options.dryRun,
  }
}

export function releaseSoloLocalStaticSuitePath(profileId: string): string {
  const normalized = normalizeProfileId(profileId)
  if (normalized === DEFAULT_RELEASE_SOLO_LOCAL_STATIC_SUITE_PROFILE) {
    return DEFAULT_RELEASE_SOLO_LOCAL_STATIC_SUITE_PATH
  }
  return `ops/release-artifacts/${normalized}.solo-local-static-suite.json`
}

export function buildReleaseSoloLocalStaticSuiteSteps(profileId: string): ReleaseSoloLocalStaticSuiteStep[] {
  const profile = normalizeProfileId(profileId)
  return [
    {
      gateId: 'service_process_guard',
      command: 'npm',
      args: ['run', 'ops:service-process-guard'],
      startsService: false,
      requiresHostedEvidence: false,
      requiresStagingProdEndpoint: false,
    },
    {
      gateId: 'solo_local_release_gate_matrix',
      command: 'npm',
      args: ['run', 'release:solo-local-gate-matrix:check', '--', '--profile', profile],
      startsService: false,
      requiresHostedEvidence: false,
      requiresStagingProdEndpoint: false,
    },
    {
      gateId: 'release_candidate_dry_run_snapshot',
      command: 'npm',
      args: ['run', 'release:candidate:dry-run-snapshot:check', '--', '--profile', profile],
      startsService: false,
      requiresHostedEvidence: false,
      requiresStagingProdEndpoint: false,
    },
    {
      gateId: 'release_boundary_mandatory_artifacts',
      command: 'npm',
      args: ['run', 'release:boundary-artifacts:check', '--', '--profile', profile],
      startsService: false,
      requiresHostedEvidence: false,
      requiresStagingProdEndpoint: false,
    },
    {
      gateId: 'release_boundary_artifact_coverage',
      command: 'npm',
      args: ['run', 'release:boundary-artifact-coverage:check', '--', '--profile', profile],
      startsService: false,
      requiresHostedEvidence: false,
      requiresStagingProdEndpoint: false,
    },
    {
      gateId: 'local_anchor_static_sweep',
      command: 'npm',
      args: ['run', 'release:local-anchor-static-sweep:check', '--', '--profile', profile],
      startsService: false,
      requiresHostedEvidence: false,
      requiresStagingProdEndpoint: false,
    },
    {
      gateId: 'release_github_actions_summary_local_replay',
      command: 'npm',
      args: ['run', 'release:github-actions-summary-local-replay:check', '--', '--profile', profile],
      startsService: false,
      requiresHostedEvidence: false,
      requiresStagingProdEndpoint: false,
    },
    {
      gateId: 'github_actions_run_archive_static_contract',
      command: 'npm',
      args: ['run', 'release:github-actions-run-archive:check', '--', '--profile', profile],
      startsService: false,
      requiresHostedEvidence: false,
      requiresStagingProdEndpoint: false,
    },
  ]
}

export function shellLineForReleaseSoloLocalStaticSuiteStep(step: ReleaseSoloLocalStaticSuiteStep): string {
  return [npmCommand(), ...step.args].map(quoteShellArg).join(' ')
}

export function validateReleaseSoloLocalStaticSuiteManifest(profileId: string): void {
  const profile = normalizeProfileId(profileId)
  const manifestPath = releaseSoloLocalStaticSuitePath(profile)
  if (!existsSync(manifestPath)) {
    throw new Error(`release solo/local static suite missing: ${manifestPath}`)
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as ReleaseSoloLocalStaticSuiteManifest
  const expectedSteps = buildReleaseSoloLocalStaticSuiteSteps(profile).map((step, index) => ({
    index: index + 1,
    gateId: step.gateId,
    command: shellLineForReleaseSoloLocalStaticSuiteStep(step),
    startsService: step.startsService,
    requiresHostedEvidence: step.requiresHostedEvidence,
    requiresStagingProdEndpoint: step.requiresStagingProdEndpoint,
  }))

  const errors: string[] = []
  if (manifest.status !== 'current Stage 848 solo-local static release suite') {
    errors.push('manifest status is not current Stage 848 solo-local static release suite')
  }
  if (manifest.profileId !== profile) errors.push(`manifest profileId mismatch: ${manifest.profileId}`)
  if (manifest.suiteCommand !== `npm.cmd run release:solo-local-static-suite:check -- --profile ${profile}`) {
    errors.push('suiteCommand mismatch')
  }
  if (manifest.nonStarting !== true) errors.push('nonStarting must be true')
  if (manifest.sourceMatrix !== 'ops/release-artifacts/local-dev.solo-local-release-gate-matrix.json') {
    errors.push('sourceMatrix mismatch')
  }
  if (JSON.stringify(manifest.steps) !== JSON.stringify(expectedSteps)) {
    errors.push('release solo/local static suite manifest drift')
  }
  for (const nonClaim of REQUIRED_NON_CLAIMS) {
    if (!manifest.nonClaims.includes(nonClaim)) errors.push(`missing non-claim: ${nonClaim}`)
  }
  if (errors.length > 0) {
    throw new Error(`release solo/local static suite invalid: ${errors.join('; ')}`)
  }
}

export function runReleaseSoloLocalStaticSuite(options: ReleaseSoloLocalStaticSuiteOptions): void {
  const profile = normalizeProfileId(options.profileId)
  const steps = buildReleaseSoloLocalStaticSuiteSteps(profile)
  if (options.dryRun) {
    console.log(JSON.stringify({ ok: true, dryRun: true, profileId: profile, steps }, null, 2))
    return
  }

  validateReleaseSoloLocalStaticSuiteManifest(profile)
  for (const [index, step] of steps.entries()) {
    console.log(`[release-solo-local-static-suite] ${index + 1}/${steps.length} ${step.gateId}`)
    const result =
      process.platform === 'win32'
        ? spawnSync(shellLineForReleaseSoloLocalStaticSuiteStep(step), { stdio: 'inherit', shell: true })
        : spawnSync(npmCommand(), step.args, { stdio: 'inherit' })
    if (result.status !== 0) {
      const errorSuffix = result.error instanceof Error ? `: ${result.error.message}` : ''
      throw new Error(`release solo/local static suite failed at step ${index + 1}: ${step.gateId}${errorSuffix}`)
    }
  }
  console.log(`[release-solo-local-static-suite] passed for profile ${profile}`)
}

function normalizeProfileId(profileId: string): string {
  const normalized = profileId.trim() || DEFAULT_RELEASE_SOLO_LOCAL_STATIC_SUITE_PROFILE
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`invalid release solo/local static suite profile id: ${profileId}`)
  }
  return normalized
}

function npmCommand(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function quoteShellArg(arg: string): string {
  if (arg.length === 0) return '""'
  if (!/[\s"]/.test(arg)) return arg
  return `"${arg.replace(/"/g, '\\"')}"`
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try {
    runReleaseSoloLocalStaticSuite(parseReleaseSoloLocalStaticSuiteArgs(process.argv.slice(2)))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
