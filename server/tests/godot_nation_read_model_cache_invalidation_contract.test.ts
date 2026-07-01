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
const main = read('godot-client/scripts/app/main.gd')
const warApplySource = functionSource(main, 'func _apply_nation_war_objective_read_model(model: Dictionary) -> void:')
const membershipApplySource = functionSource(main, 'func _apply_organization_membership_read_model(model: Dictionary) -> void:')

assert.ok(
  backendApiClient.includes('if request_path.begins_with("/api/nation/war-objectives")') &&
    backendApiClient.includes('boundary["readPacketKind"] = "nation_war_objective_read_model"') &&
    backendApiClient.includes('boundary["versionField"] = "generatedAtWorldVersion"') &&
    backendApiClient.includes('boundary["cacheInvalidationRule"] = "reject_stale_nation_world_version"') &&
    backendApiClient.includes('boundary["staleResponseRejectedBy"] = "main._apply_nation_war_objective_read_model"'),
  'BackendApiClient must mark nation war objective packets with generatedAtWorldVersion cache invalidation.',
)

assert.ok(
  backendApiClient.includes('if request_path.begins_with("/api/nation/organization/membership")') &&
    backendApiClient.includes('boundary["readPacketKind"] = "organization_membership_read_model"') &&
    backendApiClient.includes('boundary["versionField"] = "generatedAtWorldVersion"') &&
    backendApiClient.includes('boundary["cacheInvalidationRule"] = "reject_stale_nation_world_version"') &&
    backendApiClient.includes('boundary["staleResponseRejectedBy"] = "main._apply_organization_membership_read_model"'),
  'BackendApiClient must mark organization membership packets with generatedAtWorldVersion cache invalidation.',
)

assert.ok(
  main.includes('var _last_rejected_nation_read_model_cache: Dictionary = {}') &&
    main.includes('func get_last_rejected_nation_read_model_cache() -> Dictionary:') &&
    main.includes('return _last_rejected_nation_read_model_cache.duplicate(true)'),
  'Main must expose rejected stale nation read-model diagnostics.',
)

assert.ok(
  warApplySource.includes('if _is_stale_nation_world_version(model, _read_current_nation_war_objective_read_model()):') &&
    warApplySource.includes('_last_rejected_nation_read_model_cache = _build_stale_nation_read_model_rejection(model, _read_current_nation_war_objective_read_model(), "nation_war_objective_read_model")') &&
    warApplySource.includes('return') &&
    warApplySource.includes('_last_rejected_nation_read_model_cache = {}') &&
    warApplySource.includes('WorldStore.world = world_data'),
  'Nation war objective apply path must reject stale generatedAtWorldVersion before updating WorldStore presentation cache.',
)

assert.ok(
  membershipApplySource.includes('if _is_stale_nation_world_version(model, _read_current_organization_membership_read_model()):') &&
    membershipApplySource.includes('_last_rejected_nation_read_model_cache = _build_stale_nation_read_model_rejection(model, _read_current_organization_membership_read_model(), "organization_membership_read_model")') &&
    membershipApplySource.includes('return') &&
    membershipApplySource.includes('_last_rejected_nation_read_model_cache = {}') &&
    membershipApplySource.includes('WorldStore.world = world_data'),
  'Organization membership apply path must reject stale generatedAtWorldVersion before updating WorldStore presentation cache.',
)

assert.ok(
  main.includes('func _is_stale_nation_world_version(incoming_model: Dictionary, current_model: Dictionary) -> bool:') &&
    main.includes('var current_version := _read_nation_generated_world_version(current_model)') &&
    main.includes('var incoming_version := _read_nation_generated_world_version(incoming_model)') &&
    main.includes('return incoming_version < current_version'),
  'Main must compare incoming and current generatedAtWorldVersion values.',
)

assert.ok(
  main.includes('func _build_stale_nation_read_model_rejection(incoming_model: Dictionary, current_model: Dictionary, read_packet_kind: String) -> Dictionary:') &&
    main.includes('"reason": "stale_nation_world_version"') &&
    main.includes('"incomingGeneratedAtWorldVersion": _read_nation_generated_world_version(incoming_model)') &&
    main.includes('"currentGeneratedAtWorldVersion": _read_nation_generated_world_version(current_model)') &&
    main.includes('"cacheRole": "presentation_snapshot_cache"') &&
    main.includes('"serverTruthOwner": "server"') &&
    main.includes('"rejectionBasis": "generatedAtWorldVersion_server_read_model"'),
  'Nation stale rejection metadata must identify server read-model version and cache role.',
)

console.log('[godot_nation_read_model_cache_invalidation_contract] all checks passed')
