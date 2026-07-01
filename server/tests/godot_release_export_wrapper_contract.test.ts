import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildGodotReleaseExportSteps,
  DEFAULT_GODOT_RELEASE_EXPORT_OUTPUT,
  DEFAULT_GODOT_RELEASE_EXPORT_PRESET,
  DEFAULT_GODOT_RELEASE_EXPORT_PROFILE,
  parseGodotReleaseExportArgs,
  shellLineForGodotReleaseExportStep,
} from '../../scripts/run_godot_release_export'

assert.equal(DEFAULT_GODOT_RELEASE_EXPORT_PROFILE, 'local-dev')
assert.equal(DEFAULT_GODOT_RELEASE_EXPORT_PRESET, 'Windows Desktop')
assert.equal(DEFAULT_GODOT_RELEASE_EXPORT_OUTPUT, 'exports/windows/SLG Commander.exe')

const parsedDefaults = parseGodotReleaseExportArgs([])
assert.deepEqual(parsedDefaults, {
  profileId: 'local-dev',
  preset: 'Windows Desktop',
  outputPath: 'exports/windows/SLG Commander.exe',
  godotExe: '',
  dryRun: false,
})

const parsedCustom = parseGodotReleaseExportArgs([
  '--profile',
  'staging',
  '--preset',
  'Windows Desktop',
  '--output',
  'exports/windows/Staging Commander.exe',
  '--godot-exe',
  'C:/Godot/Godot_v4.6.2-stable_win64_console.exe',
  '--dry-run',
])
assert.deepEqual(parsedCustom, {
  profileId: 'staging',
  preset: 'Windows Desktop',
  outputPath: 'exports/windows/Staging Commander.exe',
  godotExe: 'C:/Godot/Godot_v4.6.2-stable_win64_console.exe',
  dryRun: true,
})

const steps = buildGodotReleaseExportSteps(parsedCustom)
assert.deepEqual(
  steps.map((step) => step.name),
  [
    'run release preflight for selected client profile',
    'export Godot release package',
    'generate client package manifest',
  ],
)

const preflightStep = steps[0]
assert.equal(preflightStep.command, 'npm')
assert.deepEqual(preflightStep.args, ['run', 'godot:release:preflight', '--', '--profile', 'staging'])

const exportStep = steps[1]
assert.equal(exportStep.command, 'scripts\\run_python.cmd')
assert.deepEqual(exportStep.args, [
  'scripts\\launch_godot.py',
  '--mode',
  'export-release',
  '--preset',
  'Windows Desktop',
  '--output',
  'exports/windows/Staging Commander.exe',
  '--godot-exe',
  'C:/Godot/Godot_v4.6.2-stable_win64_console.exe',
])
const exportShellLine = shellLineForGodotReleaseExportStep(exportStep)
assert.ok(
  exportShellLine.includes('--preset "Windows Desktop"'),
  'release export wrapper must quote preset names with spaces before invoking Windows batch/Python.',
)
assert.ok(
  exportShellLine.includes('--output "exports/windows/Staging Commander.exe"'),
  'release export wrapper must quote output paths with spaces before invoking Windows batch/Python.',
)

const manifestStep = steps[2]
assert.equal(manifestStep.command, 'npm')
assert.deepEqual(manifestStep.args, [
  'run',
  'release:client-package-manifest:generate',
  '--',
  '--profile',
  'staging',
  '--preset',
  'Windows Desktop',
  '--artifact',
  'exports/windows/Staging Commander.exe',
])

const packageJson = readFileSync('package.json', 'utf8')
assert.ok(
  packageJson.includes('"godot:release:export": "tsx scripts/run_godot_release_export.ts"'),
  'package.json must expose godot:release:export as the only formal release export entry.',
)
assert.ok(
  packageJson.includes('"release:client-package-manifest:generate": "tsx scripts/generate_client_package_manifest.ts"'),
  'package.json must expose release:client-package-manifest:generate after a successful export.',
)

const launcher = readFileSync('scripts/launch_godot.py', 'utf8')
assert.ok(
  launcher.includes('"export-release"') && launcher.includes('"--export-release"'),
  'Godot launcher must support a real export-release mode that calls Godot --export-release.',
)
assert.ok(
  launcher.includes('"--preset"') && launcher.includes('"--output"'),
  'Godot launcher export-release mode must accept preset and output path.',
)

console.log('[godot_release_export_wrapper_contract] all checks passed')
