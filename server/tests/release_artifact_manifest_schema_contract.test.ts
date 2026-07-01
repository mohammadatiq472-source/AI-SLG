import assert from 'node:assert/strict'
import {
  CLIENT_ENDPOINT_PROFILE_FORBIDDEN_KEYS,
  validateClientEndpointProfileManifest,
} from '../../shared/contracts/release/clientEndpointProfileManifest'
import { validateServerReleaseArtifactManifest } from '../../shared/contracts/release/serverReleaseArtifactManifest'

const validClientProfile = {
  profileId: 'local-dev',
  apiBaseUrl: 'http://127.0.0.1:8787',
  assetManifestUrl: 'http://127.0.0.1:8787/assets/client-manifest.json',
  minimumServerBuild: '2026.06.15',
  clientBuildChannel: 'dev',
  capabilities: { playerHistory: true, saveLoadList: true },
  cachePolicy: { readModels: 'read_through_presentation_cache', offlineAuthority: false },
  timeoutsMs: { read: 10000, write: 15000 },
}

assert.equal(validateClientEndpointProfileManifest(validClientProfile).ok, true)

for (const forbiddenKey of CLIENT_ENDPOINT_PROFILE_FORBIDDEN_KEYS) {
  const result = validateClientEndpointProfileManifest({
    ...validClientProfile,
    [forbiddenKey]: 'leak',
  })
  assert.equal(result.ok, false, `${forbiddenKey} must be rejected from client profile manifests`)
}

const validServerArtifact = {
  serverBuildId: '2026.06.15-stage789',
  routes: [
    {
      path: '/api/player-history',
      owner: 'server-owned',
      auth: 'player-session',
      clientVisible: true,
      mutation: false,
    },
  ],
  persistence: [
    {
      name: 'world-save-slots',
      owner: 'server-owned',
      clientPackaged: false,
      restoreAuthority: 'server-only',
    },
  ],
  secrets: [{ name: 'SAVE_SLOT_RESTORE_SCOPE_TOKEN', inClientPackage: false, inOpsSecretStore: true }],
  producers: [{ name: 'PlayerHistorySaveLoadProducer', visibility: 'player-safe-summary', sourceRefs: 'internal-only' }],
  opsGates: ['health-check', 'backup-restore-drill', 'telemetry-smoke', 'rollback-plan'],
}

assert.equal(validateServerReleaseArtifactManifest(validServerArtifact).ok, true)
assert.equal(
  validateServerReleaseArtifactManifest({
    ...validServerArtifact,
    secrets: [{ name: 'DATABASE_URL', inClientPackage: true, inOpsSecretStore: true }],
  }).ok,
  false,
)

console.log('[release_artifact_manifest_schema_contract] all checks passed')
