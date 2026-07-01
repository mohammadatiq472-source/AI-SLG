import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { CLIENT_ENDPOINT_PROFILE_FORBIDDEN_KEYS, validateClientEndpointProfileManifest } from '../../shared/contracts/release/clientEndpointProfileManifest'
import { validateServerReleaseArtifactManifest } from '../../shared/contracts/release/serverReleaseArtifactManifest'

const CLIENT_PROFILE_PATH = 'godot-client/profiles/local-dev.client-profile.json'
const SERVER_RELEASE_ARTIFACT_PATH = 'ops/release-artifacts/local-dev.server-release-artifact.json'

function readJson(path: string): Record<string, unknown> {
  assert.ok(existsSync(path), `${path} must exist as the current manifest instance`)
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
}

const clientProfile = readJson(CLIENT_PROFILE_PATH)
const serverArtifact = readJson(SERVER_RELEASE_ARTIFACT_PATH)

const clientValidation = validateClientEndpointProfileManifest(clientProfile)
assert.equal(clientValidation.ok, true, `client profile must validate: ${clientValidation.errors.join('; ')}`)

const serverValidation = validateServerReleaseArtifactManifest(serverArtifact)
assert.equal(serverValidation.ok, true, `server release artifact must validate: ${serverValidation.errors.join('; ')}`)

assert.equal(clientProfile.profileId, 'local-dev')
assert.equal(serverArtifact.profileId, clientProfile.profileId)
assert.equal(serverArtifact.clientProfilePath, CLIENT_PROFILE_PATH)

const serializedClientProfile = JSON.stringify(clientProfile)
for (const forbiddenKey of CLIENT_ENDPOINT_PROFILE_FORBIDDEN_KEYS) {
  assert.ok(
    !serializedClientProfile.includes(forbiddenKey),
    `client profile instance must not contain forbidden server/private key ${forbiddenKey}`,
  )
}

const capabilities = clientProfile.capabilities as Record<string, unknown>
for (const capability of ['playerHistory', 'saveLoadList', 'aiActivitySummary', 'inbox', 'nationReadModels']) {
  assert.equal(capabilities[capability], true, `client profile must expose safe public capability ${capability}`)
}

const routes = serverArtifact.routes as Array<Record<string, unknown>>
for (const requiredRoute of ['/api/session/join', '/api/world', '/api/player-history', '/api/ai/players']) {
  assert.ok(routes.some((route) => route.path === requiredRoute), `server release artifact must list route ${requiredRoute}`)
}

for (const route of routes) {
  assert.equal(route.owner, 'server-owned', `route ${String(route.path)} must be server-owned`)
  if (String(route.path).includes('/archive/restore')) {
    assert.equal(route.clientVisible, false, `ops restore route ${String(route.path)} must not be client-visible`)
    assert.equal(route.auth, 'ops-scope-token', `ops restore route ${String(route.path)} must require ops auth`)
  }
}

const secrets = serverArtifact.secrets as Array<Record<string, unknown>>
for (const secretName of ['SAVE_SLOT_RESTORE_SCOPE_TOKEN', 'DATABASE_URL', 'REDIS_URL']) {
  const secret = secrets.find((entry) => entry.name === secretName)
  assert.ok(secret, `server release artifact must list server/ops secret ${secretName}`)
  assert.equal(secret.inClientPackage, false, `${secretName} must stay out of client package`)
  assert.equal(secret.inOpsSecretStore, true, `${secretName} must belong to ops secret storage`)
}

console.log('[release_artifact_manifest_instances_contract] all checks passed')
