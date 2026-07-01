import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  CLIENT_ENDPOINT_PROFILE_FORBIDDEN_KEYS,
  validateClientEndpointProfileManifest,
} from '../../shared/contracts/release/clientEndpointProfileManifest'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

const appConfig = read('godot-client/autoload/app_config.gd')
const clientProfile = JSON.parse(read('godot-client/profiles/local-dev.client-profile.json')) as Record<string, unknown>
const clientProfileValidation = validateClientEndpointProfileManifest(clientProfile)

assert.equal(clientProfileValidation.ok, true, `client profile must validate: ${clientProfileValidation.errors.join('; ')}`)

assert.ok(
  appConfig.includes('const DEFAULT_CLIENT_PROFILE_PATH := "res://profiles/active.client-profile.json"') &&
    appConfig.includes('var client_profile_id: String') &&
    appConfig.includes('var asset_manifest_url: String') &&
    appConfig.includes('var minimum_server_build: String') &&
    appConfig.includes('var client_build_channel: String') &&
    appConfig.includes('var client_capabilities: Dictionary') &&
    appConfig.includes('var client_cache_policy: Dictionary') &&
    appConfig.includes('var client_timeouts_ms: Dictionary'),
  'AppConfig must expose only public client endpoint/profile fields from the packaged profile.',
)

assert.ok(
  appConfig.includes('_apply_client_endpoint_profile(_read_client_endpoint_profile(DEFAULT_CLIENT_PROFILE_PATH))'),
  'AppConfig._ready must read and apply the packaged client endpoint profile before env overrides.',
)

for (const requiredFunction of [
  'func _read_client_endpoint_profile(path: String) -> Dictionary:',
  'func _apply_client_endpoint_profile(profile: Dictionary) -> void:',
  'func get_client_endpoint_profile_summary() -> Dictionary:',
]) {
  assert.ok(appConfig.includes(requiredFunction), `AppConfig must implement ${requiredFunction}`)
}

for (const allowedKey of [
  'profileId',
  'profileLabel',
  'apiBaseUrl',
  'assetManifestUrl',
  'minimumServerBuild',
  'clientBuildChannel',
  'capabilities',
  'cachePolicy',
  'timeoutsMs',
]) {
  assert.ok(appConfig.includes(`"${allowedKey}"`), `AppConfig must explicitly read allowed profile key ${allowedKey}`)
}

for (const forbiddenKey of CLIENT_ENDPOINT_PROFILE_FORBIDDEN_KEYS) {
  assert.ok(!appConfig.includes(forbiddenKey), `AppConfig must not hard-code forbidden server/private key ${forbiddenKey}`)
}

console.log('[godot_app_config_client_profile_contract] all checks passed')
