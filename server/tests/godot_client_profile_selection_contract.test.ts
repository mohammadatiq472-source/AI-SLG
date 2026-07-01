import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  ACTIVE_CLIENT_PROFILE_PATH,
  CLIENT_PROFILE_SOURCE_DIR,
  selectGodotClientProfile,
  sourcePathForClientProfile,
} from '../../scripts/select_godot_client_profile'
import {
  CLIENT_ENDPOINT_PROFILE_FORBIDDEN_KEYS,
  validateClientEndpointProfileManifest,
} from '../../shared/contracts/release/clientEndpointProfileManifest'

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
}

const result = selectGodotClientProfile({ profileId: 'local-dev' })
assert.equal(result.profileId, 'local-dev')
assert.equal(result.sourcePath, sourcePathForClientProfile('local-dev'))
assert.equal(result.activePath, ACTIVE_CLIENT_PROFILE_PATH)
assert.equal(CLIENT_PROFILE_SOURCE_DIR, 'godot-client/profiles')

const sourceProfile = readJson(result.sourcePath)
const activeProfile = readJson(ACTIVE_CLIENT_PROFILE_PATH)
assert.deepEqual(activeProfile, sourceProfile, 'active client profile must be generated from the selected source profile')

const activeValidation = validateClientEndpointProfileManifest(activeProfile)
assert.equal(activeValidation.ok, true, `active client profile must validate: ${activeValidation.errors.join('; ')}`)

const serializedActiveProfile = JSON.stringify(activeProfile)
for (const forbiddenKey of CLIENT_ENDPOINT_PROFILE_FORBIDDEN_KEYS) {
  assert.ok(!serializedActiveProfile.includes(forbiddenKey), `active profile must not contain forbidden key ${forbiddenKey}`)
}

const appConfig = readFileSync('godot-client/autoload/app_config.gd', 'utf8')
assert.ok(
  appConfig.includes('const DEFAULT_CLIENT_PROFILE_PATH := "res://profiles/active.client-profile.json"'),
  'AppConfig must read the generated active client profile, not a source profile directly.',
)
assert.ok(
  !appConfig.includes('res://profiles/local-dev.client-profile.json'),
  'AppConfig must not be hard-wired to the local-dev source profile.',
)

const exportPresets = readFileSync('godot-client/export_presets.cfg', 'utf8')
assert.ok(
  exportPresets.includes('profiles/active.client-profile.json') &&
    !exportPresets.includes('profiles/*.client-profile.json') &&
    !exportPresets.includes('profiles/**/*.client-profile.json') &&
    !exportPresets.includes('profiles/local-dev.client-profile.json'),
  'Godot export preset must include only the generated active client profile, not every source profile.',
)

console.log('[godot_client_profile_selection_contract] all checks passed')
