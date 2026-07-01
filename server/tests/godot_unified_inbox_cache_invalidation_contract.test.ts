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
const mainChatOverlay = read('godot-client/scripts/ui/main_chat_overlay.gd')
const refreshMailboxSource = functionSource(mainChatOverlay, 'func _refresh_mailbox() -> void:')

assert.ok(
  backendApiClient.includes('if request_path.begins_with("/api/inbox")') &&
    backendApiClient.includes('boundary["readPacketKind"] = "unified_inbox_read_model"') &&
    backendApiClient.includes('boundary["versionField"] = "clientRefreshSequence"') &&
    backendApiClient.includes('boundary["cacheInvalidationRule"] = "reject_out_of_order_mailbox_refresh"') &&
    backendApiClient.includes('boundary["staleResponseRejectedBy"] = "MainChatOverlay._apply_unified_inbox_backend_read_model"'),
  'BackendApiClient must mark /api/inbox packets with a concrete client refresh-order invalidation rule.',
)

assert.ok(
  mainChatOverlay.includes('var _mailbox_refresh_sequence := 0') &&
    mainChatOverlay.includes('var _last_applied_mailbox_refresh_sequence := 0') &&
    mainChatOverlay.includes('var _last_rejected_mailbox_read_model_cache: Dictionary = {}') &&
    mainChatOverlay.includes('func get_last_rejected_mailbox_read_model_cache() -> Dictionary:') &&
    mainChatOverlay.includes('return _last_rejected_mailbox_read_model_cache.duplicate(true)'),
  'MainChatOverlay must expose mailbox refresh ordering state and rejected stale inbox diagnostics.',
)

assert.ok(
  refreshMailboxSource.includes('_mailbox_refresh_sequence += 1') &&
    refreshMailboxSource.includes('var refresh_sequence := _mailbox_refresh_sequence') &&
    refreshMailboxSource.includes('_apply_unified_inbox_backend_read_model(data, refresh_sequence)') &&
    !refreshMailboxSource.includes('_mailbox_items = items'),
  'MainChatOverlay normal mailbox refresh must apply data through the out-of-order guard instead of directly replacing mailbox items.',
)

assert.ok(
  mainChatOverlay.includes('func _apply_unified_inbox_backend_read_model(data: Dictionary, request_sequence: int) -> bool:') &&
    mainChatOverlay.includes('if request_sequence < _last_applied_mailbox_refresh_sequence:') &&
    mainChatOverlay.includes('_last_rejected_mailbox_read_model_cache = _build_out_of_order_mailbox_rejection(data, request_sequence)') &&
    mainChatOverlay.includes('return false') &&
    mainChatOverlay.includes('_last_applied_mailbox_refresh_sequence = request_sequence') &&
    mainChatOverlay.includes('_last_rejected_mailbox_read_model_cache = {}') &&
    mainChatOverlay.includes('_mailbox_items = items') &&
    mainChatOverlay.includes('_render_mailbox_items()') &&
    mainChatOverlay.includes('return true'),
  'MainChatOverlay must reject older mailbox refresh responses before replacing the visible inbox cache.',
)

assert.ok(
  mainChatOverlay.includes('func _build_out_of_order_mailbox_rejection(data: Dictionary, request_sequence: int) -> Dictionary:') &&
    mainChatOverlay.includes('"reason": "out_of_order_mailbox_refresh"') &&
    mainChatOverlay.includes('"incomingRefreshSequence": request_sequence') &&
    mainChatOverlay.includes('"lastAppliedRefreshSequence": _last_applied_mailbox_refresh_sequence') &&
    mainChatOverlay.includes('"readPacketKind": "unified_inbox_read_model"') &&
    mainChatOverlay.includes('"cacheRole": "presentation_snapshot_cache"') &&
    mainChatOverlay.includes('"serverTruthOwner": "server"') &&
    mainChatOverlay.includes('"rejectionBasis": "client_refresh_order_only_not_server_version"'),
  'Mailbox stale rejection metadata must state that the guard is client refresh ordering, not server truth.',
)

console.log('[godot_unified_inbox_cache_invalidation_contract] all checks passed')
