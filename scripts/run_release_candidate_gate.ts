import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const DEFAULT_RELEASE_CANDIDATE_PROFILE = 'local-dev'

export type ReleaseCandidateGateOptions = {
  profileId: string
  dryRun: boolean
}

export type ReleaseCandidateGateStep = {
  name: string
  command: 'npm'
  args: string[]
}

export function parseReleaseCandidateGateArgs(argv: string[]): ReleaseCandidateGateOptions {
  const options: ReleaseCandidateGateOptions = {
    profileId: DEFAULT_RELEASE_CANDIDATE_PROFILE,
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
    throw new Error(`unknown release candidate argument: ${arg}`)
  }

  return {
    profileId: normalizeProfileId(options.profileId),
    dryRun: options.dryRun,
  }
}

export function buildReleaseCandidateGateSteps(profileId: string): ReleaseCandidateGateStep[] {
  const profile = normalizeProfileId(profileId)
  return [
    {
      name: 'validate service launch boundary registry',
      command: 'npm',
      args: ['run', 'test:service-launch-boundary-registry-stage834-contract'],
    },
    {
      name: 'validate direct backend spawn guard index',
      command: 'npm',
      args: ['run', 'service:direct-backend-spawn-guard:check', '--', '--profile', profile],
    },
    {
      name: 'validate solo-local release gate matrix',
      command: 'npm',
      args: ['run', 'release:solo-local-gate-matrix:check', '--', '--profile', profile],
    },
    {
      name: 'validate release boundary mandatory artifacts',
      command: 'npm',
      args: ['run', 'release:boundary-artifacts:check', '--', '--profile', profile],
    },
    {
      name: 'run Godot release export wrapper',
      command: 'npm',
      args: ['run', 'godot:release:export', '--', '--profile', profile],
    },
    {
      name: 'generate AI subject release boundary manifest',
      command: 'npm',
      args: ['run', 'generate:ai-subject-release-boundary', '--', '--profile', profile],
    },
    {
      name: 'validate generated server release artifact',
      command: 'npm',
      args: ['run', 'test:server-release-artifact-generation-contract'],
    },
    {
      name: 'validate generated client package manifest',
      command: 'npm',
      args: ['run', 'test:client-package-manifest-generation-contract'],
    },
    {
      name: 'validate AI subject release boundary manifest',
      command: 'npm',
      args: ['run', 'test:ai-subject-release-boundary-manifest-contract'],
    },
    {
      name: 'validate gameplay anchor registry',
      command: 'npm',
      args: ['run', 'test:gameplay-anchor-registry-stage829-contract'],
    },
    {
      name: 'validate ops secret restore recovery checklist',
      command: 'npm',
      args: ['run', 'release:ops:check', '--', '--profile', profile],
    },
    {
      name: 'verify release artifact drift is clean',
      command: 'npm',
      args: ['run', 'release:artifact-drift:check', '--', '--profile', profile],
    },
    {
      name: 'scan saved Godot release export logs',
      command: 'npm',
      args: ['run', 'release:export-hygiene:scan'],
    },
  ]
}

export function shellLineForReleaseCandidateGateStep(step: ReleaseCandidateGateStep): string {
  return [npmCommand(), ...step.args].map(quoteShellArg).join(' ')
}

export function runReleaseCandidateGate(options: ReleaseCandidateGateOptions): void {
  const normalizedProfile = normalizeProfileId(options.profileId)
  const steps = buildReleaseCandidateGateSteps(normalizedProfile)

  if (options.dryRun) {
    console.log(JSON.stringify({ ok: true, dryRun: true, profileId: normalizedProfile, steps }, null, 2))
    return
  }

  for (const [index, step] of steps.entries()) {
    console.log(`[release-candidate] ${index + 1}/${steps.length} ${step.name}`)
    const result =
      process.platform === 'win32'
        ? spawnSync(shellLineForReleaseCandidateGateStep(step), { stdio: 'inherit', shell: true })
        : spawnSync(npmCommand(), step.args, { stdio: 'inherit' })
    if (result.status !== 0) {
      const errorSuffix = result.error instanceof Error ? `: ${result.error.message}` : ''
      throw new Error(`release candidate gate failed at step ${index + 1}: ${step.name}${errorSuffix}`)
    }
  }
  console.log(`[release-candidate] passed for profile ${normalizedProfile}`)
}

function normalizeProfileId(profileId: string): string {
  const normalized = profileId.trim() || DEFAULT_RELEASE_CANDIDATE_PROFILE
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`invalid release candidate profile id: ${profileId}`)
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
    runReleaseCandidateGate(parseReleaseCandidateGateArgs(process.argv.slice(2)))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
