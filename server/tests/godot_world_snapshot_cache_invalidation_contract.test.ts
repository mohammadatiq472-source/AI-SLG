import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

const backendApiClient = read('godot-client/scripts/infra/http/backend_api_client.gd')
const worldStore = read('godot-client/autoload/world_store.gd')

assert.ok(
    backendApiClient.includes('func _build_client_response_boundary(request_path: String) -> Dictionary:') &&
    backendApiClient.includes('if request_path.begins_with("/api/world")') &&
    backendApiClient.includes('boundary["readPacketKind"] = "world_snapshot"') &&
    backendApiClient.includes('boundary["versionField"] = "worldVersion"') &&
    backendApiClient.includes('boundary["cacheInvalidationRule"] = "reject_stale_world_version"') &&
    backendApiClient.includes('boundary["staleResponseRejectedBy"] = "WorldStore.set_world"'),
  'BackendApiClient must mark /api/world packets with a concrete worldVersion cache invalidation rule.',
)

assert.ok(
  worldStore.includes('var _last_rejected_world_snapshot_cache: Dictionary = {}') &&
    worldStore.includes('func get_last_rejected_world_snapshot_cache() -> Dictionary:') &&
    worldStore.includes('return _last_rejected_world_snapshot_cache.duplicate(true)'),
  'WorldStore must expose the last rejected stale world snapshot for diagnostics and smoke summaries.',
)

assert.ok(
  worldStore.includes('func set_world(next_world: Dictionary) -> void:') &&
    worldStore.includes('if _is_stale_server_world_snapshot(next_world):') &&
    worldStore.includes('_last_rejected_world_snapshot_cache = _build_stale_world_snapshot_rejection(next_world)') &&
    worldStore.includes('return') &&
    worldStore.includes('_last_rejected_world_snapshot_cache = {}') &&
    worldStore.includes('world = next_world'),
  'WorldStore.set_world must reject stale server snapshots before overwriting the presentation cache.',
)

assert.ok(
  worldStore.includes('func _is_stale_server_world_snapshot(next_world: Dictionary) -> bool:') &&
    worldStore.includes('var current_version := _read_server_world_snapshot_version(world)') &&
    worldStore.includes('var incoming_version := _read_server_world_snapshot_version(next_world)') &&
    worldStore.includes('return incoming_version < current_version'),
  'WorldStore must compare incoming worldVersion against the currently cached worldVersion.',
)

assert.ok(
  worldStore.includes('func _build_stale_world_snapshot_rejection(next_world: Dictionary) -> Dictionary:') &&
    worldStore.includes('"reason": "stale_world_snapshot_version"') &&
    worldStore.includes('"currentWorldVersion": _read_server_world_snapshot_version(world)') &&
    worldStore.includes('"incomingWorldVersion": _read_server_world_snapshot_version(next_world)') &&
    worldStore.includes('"serverTruthOwner": "server"') &&
    worldStore.includes('"cacheRole": "presentation_snapshot_cache"'),
  'WorldStore stale rejection metadata must say why the client cache refused the older server snapshot.',
)

assert.ok(
  worldStore.includes('func _read_server_world_snapshot_version(snapshot: Dictionary) -> int:') &&
    worldStore.includes('var version_variant: Variant = snapshot.get("worldVersion", null)') &&
    worldStore.includes('if version_variant is int:') &&
    worldStore.includes('if version_variant is float:') &&
    worldStore.includes('if version_text.is_valid_int():'),
  'WorldStore must read worldVersion robustly from numeric or string server packets.',
)

console.log('[godot_world_snapshot_cache_invalidation_contract] all checks passed')
