import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function normalize(path: string) {
  return path.replace(/\\/g, '/')
}

function listFiles(root: string, extensions: Set<string>): string[] {
  const entries = readdirSync(root)
  const files: string[] = []
  for (const entry of entries) {
    const path = join(root, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      files.push(...listFiles(path, extensions))
      continue
    }
    if (extensions.has(path.slice(path.lastIndexOf('.')))) {
      files.push(path)
    }
  }
  return files
}

const textExtensions = new Set(['.cfg', '.gd', '.godot', '.import', '.json', '.tscn', '.tres', '.uid'])
const optionalClientProfileRoots = ['godot-client/profiles']
const exportRelevantFiles = [
  'godot-client/project.godot',
  'godot-client/export_presets.cfg',
  ...listFiles('godot-client/autoload', textExtensions),
  ...listFiles('godot-client/scripts', textExtensions),
  ...listFiles('godot-client/scenes', textExtensions),
  ...listFiles('godot-client/assets', textExtensions),
  ...listFiles('godot-client/addons', textExtensions),
  ...optionalClientProfileRoots.flatMap((root) => (existsSync(root) ? listFiles(root, textExtensions) : [])),
]

const forbiddenServerOnlyTokens = [
  'OPENAI_API_KEY',
  'LLM_RELAY_API_KEY',
  'LLM_RELAY_API_KEYS',
  'LLM_RELAY_API_KEYS_FILE',
  'MEM0_API_KEY',
  'REPLAY_RAG_EMBEDDING_API_KEY',
  'REPLAY_RAG_EMBEDDING_API_KEYS',
  'REPLAY_RAG_CACHE_FILE',
  'FACTION_APIKEY_ENCRYPTION_KEY',
  'FACTION_APIKEY_ALLOW_PLAINTEXT_PERSIST',
  'AI_PLAYER_PROVIDER_ACCOUNT_OPS_TRUSTED_PROXY_SIGNATURE_SECRET',
  'AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH',
  'AI_PLAYER_RUNTIME_MODEL_API_KEY',
  'AI_PLAYER_RUNTIME_MODEL_DISPATCH_POSTGRES_URL',
  'AI_PLAYER_RUNTIME_MODEL_DISPATCH_REDIS_URL',
  'DATABASE_URL',
  'POSTGRES_URL',
  'REDIS_URL',
  'WORLD_SAVE_SLOTS_PATH',
  'WORLD_SAVE_SLOTS_ARCHIVE_DIR',
  'WORLD_PERSIST_ROOT',
  'SAVE_SLOT_RESTORE_SCOPE_TOKEN',
  'MIMO_API_KEY',
]

const forbiddenServerOnlyPathsAndFixtures = [
  '/api/save-slots/archive/restore',
  '/api/save-slots/restore',
  '/api/save-slots/smoke-setup',
  'ai_player_provider_accounts.json',
  'replay_rag_index_cache',
  'world_save_slots_archive',
  'world_save_slots.json',
  'restore token',
  'restoreToken',
  'restore_token',
]

assert.ok(
  forbiddenServerOnlyTokens.includes('SAVE_SLOT_RESTORE_SCOPE_TOKEN') &&
    forbiddenServerOnlyTokens.includes('DATABASE_URL') &&
    forbiddenServerOnlyTokens.includes('REDIS_URL'),
  'Package-boundary proof must keep server secret names forbidden from client package inputs.',
)

const tokenHits = []
for (const path of exportRelevantFiles) {
  const source = read(path)
  for (const token of [...forbiddenServerOnlyTokens, ...forbiddenServerOnlyPathsAndFixtures]) {
    if (source.includes(token)) {
      tokenHits.push(`${normalize(relative('.', path))} contains ${token}`)
    }
  }
}

assert.deepEqual(
  tokenHits,
  [],
  'Godot export/runtime inputs must not contain server secrets, provider key names, persistence paths, restore tokens, or server-only fixtures.',
)

const exportPresets = read('godot-client/export_presets.cfg')
assert.ok(
  exportPresets.includes('include_filter="assets/**/*.json,assets/**/*.tmx,assets/**/*.tsx,profiles/active.client-profile.json"'),
  'Godot export preset must include player package asset data and only the generated active client profile through include_filter.',
)

const forbiddenExportFilterFragments = [
  '.env',
  '../server',
  'server/',
  'res://server',
  'docs/',
  'res://docs',
  'tmp/',
  'res://tmp',
  'tools/',
  'res://tools',
  'ui_generated',
  'data/ui_preview',
  'Godot/app_userdata',
]
const positiveExportPresetFields = exportPresets
  .split(/\r?\n/)
  .filter((line) => /^(include_filter|export_path|encryption_include_filters)=/.test(line.trim()))
  .join('\n')
const exportFilterHits = forbiddenExportFilterFragments.filter((fragment) => positiveExportPresetFields.includes(fragment))
assert.deepEqual(
  exportFilterHits,
  [],
  'Godot export preset positive package fields must not include server docs, tools, generated evidence, preview data, app user data, or env files.',
)

const exportExcludeLine =
  exportPresets
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith('exclude_filter=')) ?? ''
for (const requiredExclude of [
  'tmp/**',
  'scripts/dev/**',
  'scenes/dev/**',
  'tools/**',
  'ui_generated/**',
  'data/ui_preview/**',
  'Godot/app_userdata/**',
]) {
  assert.ok(exportExcludeLine.includes(requiredExclude), `Godot release export must exclude ${requiredExclude}`)
}

const projectGodot = read('godot-client/project.godot')
assert.ok(
  projectGodot.includes('AppConfig="*res://autoload/app_config.gd"') &&
    projectGodot.includes('SessionStore="*res://autoload/session_store.gd"') &&
    projectGodot.includes('WorldStore="*res://autoload/world_store.gd"'),
  'Godot package boundary proof must include the runtime autoload entry points.',
)

assert.ok(
  !projectGodot.includes('server/') &&
    !projectGodot.includes('tools/') &&
    !projectGodot.includes('ui_generated/') &&
    !projectGodot.includes('data/ui_preview/'),
  'Godot project runtime graph must not point at server-only or dev-generated package inputs.',
)

const devEvidenceRoots = [
  'godot-client/ui_generated',
  'godot-client/data/ui_preview',
  'godot-client/tools',
  'godot-client/Godot/app_userdata',
]
for (const root of devEvidenceRoots) {
  assert.ok(
    !exportRelevantFiles.some((path) => normalize(path).startsWith(`${root}/`)),
    `${root} is dev evidence or local user state and must stay outside the package-boundary scan set.`,
  )
}

console.log('[godot_client_package_boundary_contract] all checks passed')
