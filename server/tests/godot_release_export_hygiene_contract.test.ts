import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildGodotReleasePackagingPreflightSteps } from '../../scripts/run_godot_release_packaging_preflight'
import {
  FORBIDDEN_GODOT_RELEASE_EXPORT_LOG_TOKENS,
  inspectGodotReleaseExportLog,
  inspectGodotReleaseExportPreset,
  REQUIRED_GODOT_RELEASE_EXPORT_EXCLUDE_PATTERNS,
} from '../../scripts/validate_godot_release_export_hygiene'

assert.deepEqual(REQUIRED_GODOT_RELEASE_EXPORT_EXCLUDE_PATTERNS, [
  'tmp/**',
  'scripts/dev/**',
  'scenes/dev/**',
  'addons/ui_preview_sandbox/**',
  'addons/editor_locale_helper/**',
  'tools/**',
  'ui_generated/**',
  'data/ui_preview/**',
  'Godot/app_userdata/**',
])

assert.ok(FORBIDDEN_GODOT_RELEASE_EXPORT_LOG_TOKENS.includes('SCRIPT ERROR'))
assert.ok(FORBIDDEN_GODOT_RELEASE_EXPORT_LOG_TOKENS.includes('res://tmp/'))
assert.ok(FORBIDDEN_GODOT_RELEASE_EXPORT_LOG_TOKENS.includes('res://scripts/dev/'))

const presetInspection = inspectGodotReleaseExportPreset('godot-client/export_presets.cfg')
assert.equal(
  presetInspection.ok,
  true,
  `Godot release export preset hygiene failed: ${presetInspection.errors.join('; ')}`,
)
assert.equal(presetInspection.presetName, 'Windows Desktop')
assert.equal(presetInspection.exportFilter, 'all_resources')
assert.deepEqual(presetInspection.missingExcludePatterns, [])

const dirtyLogInspection = inspectGodotReleaseExportLog(`
[  98% ] savepack | 保存文件：res://tmp/world_resource_live_map_capture.tscn.remap
SCRIPT ERROR: Parse Error: Too many arguments for "apply_button_style()" call.
ERROR: Failed to load script "res://scripts/dev/components/map_macro_layer_panel.gd" with error "Parse error".
`)
assert.equal(dirtyLogInspection.ok, false)
assert.deepEqual(dirtyLogInspection.hits, ['SCRIPT ERROR', 'ERROR:', 'res://tmp/', 'res://scripts/dev/'])

const cleanLogInspection = inspectGodotReleaseExportLog('[godot-release-export] exported Windows Desktop for profile local-dev')
assert.deepEqual(cleanLogInspection, { ok: true, hits: [] })

const preflightSteps = buildGodotReleasePackagingPreflightSteps('local-dev')
assert.ok(
  preflightSteps.some((step) => step.args.includes('test:godot:release-export-hygiene-contract')),
  'release preflight must run the export hygiene contract before Godot export is allowed.',
)

const packageJson = readFileSync('package.json', 'utf8')
assert.ok(
  packageJson.includes('"test:godot:release-export-hygiene-contract": "tsx server/tests/godot_release_export_hygiene_contract.test.ts"'),
  'package.json must expose the release export hygiene contract.',
)

const launcher = readFileSync('scripts/launch_godot.py', 'utf8')
assert.ok(
  launcher.includes('GODOT_RELEASE_EXPORT_STDOUT_LOG') &&
    launcher.includes('inspect_export_log_text') &&
    launcher.includes('FORBIDDEN_EXPORT_LOG_MARKERS'),
  'Godot launcher export-release mode must capture and inspect export logs.',
)

console.log('[godot_release_export_hygiene_contract] all checks passed')
