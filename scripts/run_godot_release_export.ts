import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const DEFAULT_GODOT_RELEASE_EXPORT_PROFILE = 'local-dev'
export const DEFAULT_GODOT_RELEASE_EXPORT_PRESET = 'Windows Desktop'
export const DEFAULT_GODOT_RELEASE_EXPORT_OUTPUT = 'exports/windows/SLG Commander.exe'

export type GodotReleaseExportOptions = {
  profileId: string
  preset: string
  outputPath: string
  godotExe: string
  dryRun: boolean
}

export type GodotReleaseExportStep = {
  name: string
  command: 'npm' | 'scripts\\run_python.cmd'
  args: string[]
}

export function parseGodotReleaseExportArgs(argv: string[]): GodotReleaseExportOptions {
  const options: GodotReleaseExportOptions = {
    profileId: DEFAULT_GODOT_RELEASE_EXPORT_PROFILE,
    preset: DEFAULT_GODOT_RELEASE_EXPORT_PRESET,
    outputPath: DEFAULT_GODOT_RELEASE_EXPORT_OUTPUT,
    godotExe: '',
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
    if (arg === '--preset') {
      options.preset = argv[index + 1] ?? ''
      index += 1
      continue
    }
    if (arg.startsWith('--preset=')) {
      options.preset = arg.slice('--preset='.length)
      continue
    }
    if (arg === '--output') {
      options.outputPath = argv[index + 1] ?? ''
      index += 1
      continue
    }
    if (arg.startsWith('--output=')) {
      options.outputPath = arg.slice('--output='.length)
      continue
    }
    if (arg === '--godot-exe') {
      options.godotExe = argv[index + 1] ?? ''
      index += 1
      continue
    }
    if (arg.startsWith('--godot-exe=')) {
      options.godotExe = arg.slice('--godot-exe='.length)
      continue
    }
    throw new Error(`unknown Godot release export argument: ${arg}`)
  }

  return normalizeOptions(options)
}

export function buildGodotReleaseExportSteps(options: GodotReleaseExportOptions): GodotReleaseExportStep[] {
  const normalized = normalizeOptions(options)
  const exportArgs = [
    'scripts\\launch_godot.py',
    '--mode',
    'export-release',
    '--preset',
    normalized.preset,
    '--output',
    normalized.outputPath,
  ]
  if (normalized.godotExe) {
    exportArgs.push('--godot-exe', normalized.godotExe)
  }

  return [
    {
      name: 'run release preflight for selected client profile',
      command: 'npm',
      args: ['run', 'godot:release:preflight', '--', '--profile', normalized.profileId],
    },
    {
      name: 'export Godot release package',
      command: 'scripts\\run_python.cmd',
      args: exportArgs,
    },
    {
      name: 'generate client package manifest',
      command: 'npm',
      args: [
        'run',
        'release:client-package-manifest:generate',
        '--',
        '--profile',
        normalized.profileId,
        '--preset',
        normalized.preset,
        '--artifact',
        normalized.outputPath,
      ],
    },
  ]
}

export function shellLineForGodotReleaseExportStep(step: GodotReleaseExportStep): string {
  const command = step.command === 'npm' ? npmCommand() : step.command
  return [command, ...step.args].map(quoteShellArg).join(' ')
}

export function runGodotReleaseExport(options: GodotReleaseExportOptions): void {
  const normalized = normalizeOptions(options)
  const steps = buildGodotReleaseExportSteps(normalized)

  if (normalized.dryRun) {
    console.log(JSON.stringify({ ok: true, dryRun: true, profileId: normalized.profileId, steps }, null, 2))
    return
  }

  for (const [index, step] of steps.entries()) {
    console.log(`[godot-release-export] ${index + 1}/${steps.length} ${step.name}`)
    const command = step.command === 'npm' ? npmCommand() : step.command
    const result =
      process.platform === 'win32'
        ? spawnSync(shellLineForGodotReleaseExportStep(step), { stdio: 'inherit', shell: true })
        : spawnSync(command, step.args, { stdio: 'inherit' })
    if (result.status !== 0) {
      const errorSuffix = result.error instanceof Error ? `: ${result.error.message}` : ''
      throw new Error(`Godot release export failed at step ${index + 1}: ${step.name}${errorSuffix}`)
    }
  }
  console.log(`[godot-release-export] exported ${normalized.preset} for profile ${normalized.profileId}`)
}

function normalizeOptions(options: GodotReleaseExportOptions): GodotReleaseExportOptions {
  const profileId = options.profileId.trim() || DEFAULT_GODOT_RELEASE_EXPORT_PROFILE
  if (!/^[a-z0-9][a-z0-9-]*$/.test(profileId)) {
    throw new Error(`invalid Godot release export profile id: ${options.profileId}`)
  }

  const preset = options.preset.trim() || DEFAULT_GODOT_RELEASE_EXPORT_PRESET
  const outputPath = options.outputPath.trim() || DEFAULT_GODOT_RELEASE_EXPORT_OUTPUT
  if (!preset) {
    throw new Error('Godot release export preset is required')
  }
  if (!outputPath) {
    throw new Error('Godot release export output path is required')
  }

  return {
    profileId,
    preset,
    outputPath,
    godotExe: options.godotExe.trim(),
    dryRun: options.dryRun,
  }
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
    runGodotReleaseExport(parseGodotReleaseExportArgs(process.argv.slice(2)))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
