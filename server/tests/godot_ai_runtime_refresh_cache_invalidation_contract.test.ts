import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function functionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const next = source.indexOf('\nfunc ', start + signature.length)
  return source.slice(start, next > start ? next : source.length)
}

const backendApiClient = read('godot-client/scripts/infra/http/backend_api_client.gd')
const domainAdapter = read('godot-client/scripts/app/adapters/slg_domain_action_adapter.gd')
const runtimeRefreshSource = functionSource(domainAdapter, 'func request_ai_player_runtime_refresh() -> Dictionary:')

assert.ok(
  backendApiClient.includes('if request_path.begins_with("/api/ai/players")') &&
    backendApiClient.includes('boundary["readPacketKind"] = "ai_player_runtime_read_packet"') &&
    backendApiClient.includes('boundary["versionField"] = "clientRefreshSequence"') &&
    backendApiClient.includes('boundary["cacheInvalidationRule"] = "reject_out_of_order_ai_runtime_refresh"') &&
    backendApiClient.includes('boundary["staleResponseRejectedBy"] = "SlgDomainActionAdapter._apply_ai_player_runtime_refresh_snapshot"'),
  'BackendApiClient must mark /api/ai/players packets with a concrete client refresh-order invalidation rule.',
)

assert.ok(
  domainAdapter.includes('var _ai_runtime_refresh_sequence := 0') &&
    domainAdapter.includes('var _last_applied_ai_runtime_refresh_sequence := 0') &&
    domainAdapter.includes('var _last_rejected_ai_runtime_refresh_cache: Dictionary = {}') &&
    domainAdapter.includes('func get_last_rejected_ai_runtime_refresh_cache() -> Dictionary:') &&
    domainAdapter.includes('return _last_rejected_ai_runtime_refresh_cache.duplicate(true)'),
  'SlgDomainActionAdapter must expose AI runtime refresh ordering state and rejected stale runtime diagnostics.',
)

assert.ok(
  runtimeRefreshSource.includes('_ai_runtime_refresh_sequence += 1') &&
    runtimeRefreshSource.includes('var refresh_sequence := _ai_runtime_refresh_sequence') &&
    runtimeRefreshSource.includes('_apply_ai_player_runtime_refresh_snapshot(') &&
    !runtimeRefreshSource.includes('_store_ai_player_runtime_snapshot(runtime_items, [], [], primary_ai_player_id, [], {}, {}, {}, [], list_summary, autonomy_guard)') &&
    !runtimeRefreshSource.includes('_store_ai_player_runtime_snapshot(\n\t\truntime_items,'),
  'request_ai_player_runtime_refresh must apply partial and final AI runtime snapshots through the refresh-order guard instead of directly storing them.',
)

assert.ok(
  domainAdapter.includes('func _apply_ai_player_runtime_refresh_snapshot(') &&
    domainAdapter.includes('request_sequence: int') &&
    domainAdapter.includes('if request_sequence < _last_applied_ai_runtime_refresh_sequence:') &&
    domainAdapter.includes('_last_rejected_ai_runtime_refresh_cache = _build_out_of_order_ai_runtime_refresh_rejection(primary_ai_player_id, request_sequence)') &&
    domainAdapter.includes('return false') &&
    domainAdapter.includes('_last_applied_ai_runtime_refresh_sequence = request_sequence') &&
    domainAdapter.includes('_last_rejected_ai_runtime_refresh_cache = {}') &&
    domainAdapter.includes('_store_ai_player_runtime_snapshot(') &&
    domainAdapter.includes('return true'),
  'SlgDomainActionAdapter must reject older AI runtime refresh responses before replacing playerRuntime* presentation cache.',
)

assert.ok(
  domainAdapter.includes('func _build_out_of_order_ai_runtime_refresh_rejection(primary_ai_player_id: String, request_sequence: int) -> Dictionary:') &&
    domainAdapter.includes('"reason": "out_of_order_ai_runtime_refresh"') &&
    domainAdapter.includes('"incomingRefreshSequence": request_sequence') &&
    domainAdapter.includes('"lastAppliedRefreshSequence": _last_applied_ai_runtime_refresh_sequence') &&
    domainAdapter.includes('"readPacketKind": "ai_player_runtime_read_packet"') &&
    domainAdapter.includes('"cacheRole": "presentation_snapshot_cache"') &&
    domainAdapter.includes('"serverTruthOwner": "server"') &&
    domainAdapter.includes('"rejectionBasis": "client_refresh_order_only_not_server_version"'),
  'AI runtime stale rejection metadata must state that the guard is client refresh ordering, not server truth.',
)

console.log('[godot_ai_runtime_refresh_cache_invalidation_contract] all checks passed')
