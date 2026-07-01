import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const DEFAULT_RELEASE_PACKAGING_PROFILE = 'local-dev'

export type ReleasePackagingPreflightStep = {
  name: string
  command: 'npm'
  args: string[]
}

export function buildGodotReleasePackagingPreflightSteps(profileId: string): ReleasePackagingPreflightStep[] {
  const profile = normalizeProfileId(profileId)
  return [
    {
      name: 'select active Godot client profile',
      command: 'npm',
      args: ['run', 'godot:client-profile:select', '--', '--profile', profile],
    },
    {
      name: 'validate release manifest schemas',
      command: 'npm',
      args: ['run', 'test:release-artifact:manifest-schema-contract'],
    },
    {
      name: 'validate concrete release manifest instances',
      command: 'npm',
      args: ['run', 'test:release-artifact:manifest-instances-contract'],
    },
    {
      name: 'generate server release artifact',
      command: 'npm',
      args: ['run', 'release:server-artifact:generate', '--', '--profile', profile],
    },
    {
      name: 'validate feature boundary card',
      command: 'npm',
      args: ['run', 'test:release-artifact:feature-boundary-card-contract'],
    },
    {
      name: 'validate Godot client profile selection',
      command: 'npm',
      args: ['run', 'test:godot:client-profile-selection-contract'],
    },
    {
      name: 'validate Godot AppConfig profile reader',
      command: 'npm',
      args: ['run', 'test:godot:app-config-client-profile-contract'],
    },
    {
      name: 'validate Godot client package boundary',
      command: 'npm',
      args: ['run', 'test:godot:client-package-boundary-contract'],
    },
    {
      name: 'validate Godot release export hygiene',
      command: 'npm',
      args: ['run', 'test:godot:release-export-hygiene-contract'],
    },
    {
      name: 'build TypeScript server/contracts',
      command: 'npm',
      args: ['run', 'build'],
    },
    {
      name: 'smoke Godot headless scene startup',
      command: 'npm',
      args: ['run', 'godot:headless:smoke'],
    },
  ]
}

export function runGodotReleasePackagingPreflight(profileId: string): void {
  const steps = buildGodotReleasePackagingPreflightSteps(profileId)
  for (const [index, step] of steps.entries()) {
    console.log(`[godot-release-preflight] ${index + 1}/${steps.length} ${step.name}`)
    const result = spawnSync(npmCommand(), step.args, { stdio: 'inherit', shell: process.platform === 'win32' })
    if (result.status !== 0) {
      const errorSuffix = result.error instanceof Error ? `: ${result.error.message}` : ''
      throw new Error(`release packaging preflight failed at step ${index + 1}: ${step.name}${errorSuffix}`)
    }
  }
  console.log(`[godot-release-preflight] passed for profile ${normalizeProfileId(profileId)}`)
}

function npmCommand(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm'
}

function normalizeProfileId(profileId: string): string {
  const normalized = profileId.trim() || DEFAULT_RELEASE_PACKAGING_PROFILE
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`invalid release packaging profile id: ${profileId}`)
  }
  return normalized
}

function profileArg(argv: string[]): string {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--profile') return argv[index + 1] ?? ''
    if (arg.startsWith('--profile=')) return arg.slice('--profile='.length)
  }
  return DEFAULT_RELEASE_PACKAGING_PROFILE
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try {
    runGodotReleasePackagingPreflight(profileArg(process.argv.slice(2)))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
