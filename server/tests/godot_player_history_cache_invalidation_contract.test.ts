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
const playerHistoryPanel = read('godot-client/scripts/ui/player_history_panel.gd')
const refreshFromBackendSource = functionSource(playerHistoryPanel, 'func refresh_from_backend(')
const openSharedSource = functionSource(playerHistoryPanel, 'func open_shared_player_history(')

assert.ok(
  backendApiClient.includes('if request_path.begins_with("/api/player-history")') &&
    backendApiClient.includes('boundary["readPacketKind"] = "player_history_read_model"') &&
    backendApiClient.includes('boundary["versionField"] = "timeline.generatedAt"') &&
    backendApiClient.includes('boundary["cacheInvalidationRule"] = "reject_older_timeline_generated_at"') &&
    backendApiClient.includes('boundary["staleResponseRejectedBy"] = "PlayerHistoryPanel._apply_player_history_backend_read_model"'),
  'BackendApiClient must mark /api/player-history packets with a concrete timeline.generatedAt cache invalidation rule.',
)

assert.ok(
  playerHistoryPanel.includes('var _last_rejected_player_history_read_model_cache: Dictionary = {}') &&
    playerHistoryPanel.includes('func get_last_rejected_player_history_read_model_cache() -> Dictionary:') &&
    playerHistoryPanel.includes('return _last_rejected_player_history_read_model_cache.duplicate(true)'),
  'PlayerHistoryPanel must expose the last rejected stale player-history read model for diagnostics.',
)

assert.ok(
  playerHistoryPanel.includes('func _apply_player_history_backend_read_model(read_model: Dictionary) -> bool:') &&
    playerHistoryPanel.includes('if _is_stale_player_history_read_model(read_model):') &&
    playerHistoryPanel.includes('_last_rejected_player_history_read_model_cache = _build_stale_player_history_rejection(read_model)') &&
    playerHistoryPanel.includes('return false') &&
    playerHistoryPanel.includes('_last_rejected_player_history_read_model_cache = {}') &&
    playerHistoryPanel.includes('set_player_history_read_model(read_model)') &&
    playerHistoryPanel.includes('return true'),
  'PlayerHistoryPanel backend refresh path must reject stale player-history read models before refreshing visible cache.',
)

assert.ok(
  playerHistoryPanel.includes('func _is_stale_player_history_read_model(read_model: Dictionary) -> bool:') &&
    playerHistoryPanel.includes('var current_generated_at := _read_player_history_generated_at(_read_model)') &&
    playerHistoryPanel.includes('var incoming_generated_at := _read_player_history_generated_at(read_model)') &&
    playerHistoryPanel.includes('return incoming_generated_at < current_generated_at'),
  'PlayerHistoryPanel must compare incoming timeline.generatedAt with the currently displayed read model.',
)

assert.ok(
  playerHistoryPanel.includes('func _build_stale_player_history_rejection(read_model: Dictionary) -> Dictionary:') &&
    playerHistoryPanel.includes('"reason": "stale_player_history_generated_at"') &&
    playerHistoryPanel.includes('"currentGeneratedAt": _read_player_history_generated_at(_read_model)') &&
    playerHistoryPanel.includes('"incomingGeneratedAt": _read_player_history_generated_at(read_model)') &&
    playerHistoryPanel.includes('"readPacketKind": "player_history_read_model"') &&
    playerHistoryPanel.includes('"cacheRole": "presentation_snapshot_cache"'),
  'PlayerHistoryPanel stale rejection metadata must record current/incoming generatedAt and cache role.',
)

assert.ok(
  playerHistoryPanel.includes('func _read_player_history_generated_at(read_model: Dictionary) -> String:') &&
    playerHistoryPanel.includes('var timeline := _coerce_dictionary(read_model.get("timeline", {}))') &&
    playerHistoryPanel.includes('return str(timeline.get("generatedAt", "")).strip_edges()'),
  'PlayerHistoryPanel must read timeline.generatedAt as the player-history cache revision.',
)

assert.ok(
  refreshFromBackendSource.includes('_apply_player_history_backend_read_model(data)') &&
    !refreshFromBackendSource.includes('set_player_history_read_model(data)'),
  'Normal backend refresh must use the stale-read-model guard instead of directly setting the read model.',
)

assert.ok(
  openSharedSource.includes('set_player_history_read_model(data)'),
  'Explicit shared-history opening may keep the direct set path instead of being blocked by the normal backend cache guard.',
)

console.log('[godot_player_history_cache_invalidation_contract] all checks passed')
