import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export const DEFAULT_GODOT_RELEASE_EXPORT_PRESET_PATH = 'godot-client/export_presets.cfg'
export const DEFAULT_GODOT_RELEASE_EXPORT_PRESET_NAME = 'Windows Desktop'

export const REQUIRED_GODOT_RELEASE_EXPORT_EXCLUDE_PATTERNS = [
  'tmp/**',
  'scripts/dev/**',
  'scenes/dev/**',
  'addons/ui_preview_sandbox/**',
  'addons/editor_locale_helper/**',
  'tools/**',
  'ui_generated/**',
  'data/ui_preview/**',
  'Godot/app_userdata/**',
]

export const FORBIDDEN_GODOT_RELEASE_EXPORT_LOG_TOKENS = [
  'SCRIPT ERROR',
  'ERROR:',
  'res://tmp/',
  'res://scripts/dev/',
  'res://scenes/dev/',
  'res://addons/ui_preview_sandbox/',
  'res://addons/editor_locale_helper/',
  'res://tools/',
  'res://ui_generated/',
  'res://data/ui_preview/',
  'res://Godot/app_userdata/',
]

export type GodotReleaseExportPresetInspection = {
  ok: boolean
  presetName: string
  exportFilter: string
  excludeFilter: string[]
  missingExcludePatterns: string[]
  errors: string[]
}

export type GodotReleaseExportLogInspection = {
  ok: boolean
  hits: string[]
}

export function inspectGodotReleaseExportPreset(
  presetPath = DEFAULT_GODOT_RELEASE_EXPORT_PRESET_PATH,
  presetName = DEFAULT_GODOT_RELEASE_EXPORT_PRESET_NAME,
): GodotReleaseExportPresetInspection {
  const preset = selectPreset(parseExportPresets(readFileSync(presetPath, 'utf8')), presetName)
  const errors: string[] = []
  if (!preset) {
    return {
      ok: false,
      presetName,
      exportFilter: '',
      excludeFilter: [],
      missingExcludePatterns: REQUIRED_GODOT_RELEASE_EXPORT_EXCLUDE_PATTERNS,
      errors: [`missing Godot release export preset: ${presetName}`],
    }
  }

  const exportFilter = String(preset.export_filter ?? '').trim()
  const excludeFilter = splitFilter(String(preset.exclude_filter ?? ''))
  const missingExcludePatterns = REQUIRED_GODOT_RELEASE_EXPORT_EXCLUDE_PATTERNS.filter(
    (pattern) => !excludeFilter.includes(pattern),
  )

  if (exportFilter === 'all_resources' && missingExcludePatterns.length > 0) {
    errors.push(`all_resources export must exclude dev/tmp/package-evidence roots: ${missingExcludePatterns.join(', ')}`)
  }
  if (exportFilter !== 'all_resources') {
    errors.push(`unexpected Godot release export_filter: ${exportFilter || '<empty>'}`)
  }

  return {
    ok: errors.length === 0,
    presetName: String(preset.name ?? presetName),
    exportFilter,
    excludeFilter,
    missingExcludePatterns,
    errors,
  }
}

export function inspectGodotReleaseExportLog(logText: string): GodotReleaseExportLogInspection {
  const hits = FORBIDDEN_GODOT_RELEASE_EXPORT_LOG_TOKENS.filter((token) => logText.includes(token))
  return { ok: hits.length === 0, hits }
}

function parseExportPresets(source: string): Array<Record<string, string>> {
  const presets: Record<string, Record<string, string>> = {}
  let currentId = ''
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim()
    const sectionMatch = /^\[preset\.(\d+)\]$/.exec(line)
    if (sectionMatch) {
      currentId = sectionMatch[1]
      presets[currentId] = { id: currentId }
      continue
    }
    if (!currentId || line.startsWith('[')) continue
    const keyValueMatch = /^([A-Za-z0-9_./-]+)=(.*)$/.exec(line)
    if (!keyValueMatch) continue
    presets[currentId][keyValueMatch[1]] = stripQuotes(keyValueMatch[2].trim())
  }
  return Object.keys(presets)
    .sort((left, right) => Number(left) - Number(right))
    .map((key) => presets[key])
}

function selectPreset(presets: Array<Record<string, string>>, presetName: string): Record<string, string> | null {
  return presets.find((preset) => String(preset.name ?? '').trim() === presetName) ?? null
}

function splitFilter(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function stripQuotes(value: string): string {
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    return value.slice(1, -1)
  }
  return value
}

function logPaths(argv: string[]): string[] {
  const paths: string[] = []
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--log') {
      paths.push(argv[index + 1] ?? '')
      index += 1
    } else if (arg.startsWith('--log=')) {
      paths.push(arg.slice('--log='.length))
    }
  }
  return paths.filter(Boolean)
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  const presetInspection = inspectGodotReleaseExportPreset()
  const logInspections = logPaths(process.argv.slice(2)).map((path) => ({
    path,
    ...inspectGodotReleaseExportLog(readFileSync(path, 'utf8')),
  }))
  const failedLogs = logInspections.filter((inspection) => !inspection.ok)
  const ok = presetInspection.ok && failedLogs.length === 0
  console.log(JSON.stringify({ ok, preset: presetInspection, logs: logInspections }, null, 2))
  if (!ok) process.exit(1)
}
