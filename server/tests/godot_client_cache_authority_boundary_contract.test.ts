import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

const backendApiClient = read('godot-client/scripts/infra/http/backend_api_client.gd')
const worldStore = read('godot-client/autoload/world_store.gd')

assert.ok(
  backendApiClient.includes('const CLIENT_RESPONSE_AUTHORITY_BOUNDARY := {') &&
    backendApiClient.includes('"contractId": "godot_backend_api_client_response_boundary_v1"') &&
    backendApiClient.includes('"ownerLabels": ["client-owned", "shared-contract"]') &&
    backendApiClient.includes('"serverTruthOwner": "server"') &&
    backendApiClient.includes('"clientCachePolicy": "read_through_cache_only"') &&
    backendApiClient.includes('"clientMutationAllowed": false') &&
    backendApiClient.includes('"clientTruthAllowed": false') &&
    backendApiClient.includes('"serverOwnsGameTruth": true'),
  'BackendApiClient must declare response packets as client-owned/shared-contract read-through cache, not server truth.',
)

assert.ok(
  backendApiClient.includes('func _build_client_response_boundary(request_path: String) -> Dictionary:') &&
    backendApiClient.includes('"clientBoundary": _build_client_response_boundary(path)'),
  'BackendApiClient request_json must attach internal clientBoundary metadata to every response.',
)

assert.ok(
  worldStore.includes('const WORLD_STORE_CACHE_AUTHORITY_BOUNDARY := {') &&
    worldStore.includes('"contractId": "godot_world_store_cache_boundary_v1"') &&
    worldStore.includes('"ownerLabels": ["client-owned"]') &&
    worldStore.includes('"serverTruthOwner": "server"') &&
    worldStore.includes('"cacheRole": "presentation_snapshot_cache"') &&
    worldStore.includes('"clientTruthAllowed": false') &&
    worldStore.includes('"serverReceiptRequiredForTruth": true'),
  'WorldStore must declare its domain snapshots as client-owned presentation cache, not server truth.',
)

assert.ok(
  worldStore.includes('func get_cache_authority_boundary() -> Dictionary:') &&
    worldStore.includes('return WORLD_STORE_CACHE_AUTHORITY_BOUNDARY.duplicate(true)'),
  'WorldStore must expose a stable internal cache authority boundary for contracts and diagnostics.',
)

assert.ok(
  worldStore.includes('func _sync_server_snapshot_cache_from_world() -> void:') &&
    worldStore.includes('func _apply_server_snapshot_troop_facilities(server_snapshot_variant: Variant) -> bool:') &&
    worldStore.includes('func _apply_server_snapshot_city_buildings(server_snapshot_variant: Variant) -> bool:') &&
    worldStore.includes('func _apply_server_snapshot_simple_map(slot_key: String, server_snapshot_variant: Variant) -> bool:') &&
    worldStore.includes('func _apply_server_snapshot_affairs_queue(server_snapshot_variant: Variant) -> bool:'),
  'WorldStore sync helpers must be named as server snapshot cache readers, not local authoritative truth.',
)

for (const forbidden of [
  '_sync_authoritative_slg_domain_state_from_world',
  '_apply_authoritative_troop_facilities',
  '_apply_authoritative_city_buildings',
  '_apply_authoritative_simple_map',
  '_apply_authoritative_affairs_queue',
]) {
  assert.ok(!worldStore.includes(forbidden), `WorldStore cache helpers must not keep misleading name ${forbidden}`)
}

console.log('[godot_client_cache_authority_boundary_contract] all checks passed')
