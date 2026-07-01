import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function functionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const next = source.indexOf('\nfunc ', start + signature.length)
  return source.slice(start, next > start ? next : source.length)
}

function listFiles(root: string, extensions: Set<string>): string[] {
  const entries = readdirSync(root)
  const files: string[] = []
  for (const entry of entries) {
    const path = join(root, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      files.push(...listFiles(path, extensions))
      continue
    }
    if (extensions.has(path.slice(path.lastIndexOf('.')))) {
      files.push(path)
    }
  }
  return files
}

const runtimeFiles = [
  ...listFiles('godot-client/scripts', new Set(['.gd'])),
  ...listFiles('godot-client/autoload', new Set(['.gd'])),
]
const runtimeSaveSlotReferences = runtimeFiles
  .map((path) => [path, read(path)] as const)
  .filter(([, source]) => source.includes('/api/save-slots'))
  .map(([path]) => path)

const backendApiClient = read('godot-client/scripts/infra/http/backend_api_client.gd')
const playerHistoryPanel = read('godot-client/scripts/ui/player_history_panel.gd')
const refreshFromBackendSource = functionSource(playerHistoryPanel, 'func refresh_from_backend(')
const rebuildSaveLoadSource = functionSource(playerHistoryPanel, 'func _rebuild_save_load(save_load: Dictionary) -> void:')
const restorePressedSource = functionSource(playerHistoryPanel, 'func _on_save_slot_restore_pressed(feedback_label: Label, slot_summary: Dictionary) -> void:')

assert.deepEqual(
  runtimeSaveSlotReferences,
  [],
  'Godot player runtime scripts must not directly call /api/save-slots; save/load display should arrive through /api/player-history saveLoad.',
)

assert.ok(
  !backendApiClient.includes('/api/save-slots') &&
    !backendApiClient.includes('func get_save_slots') &&
    !backendApiClient.includes('func save_slot') &&
    !backendApiClient.includes('func load_save_slot'),
  'BackendApiClient must not expose a direct save-slots consumer until a real player-runtime flow exists.',
)

assert.ok(
  backendApiClient.includes('if request_path.begins_with("/api/player-history")') &&
    backendApiClient.includes('boundary["readPacketKind"] = "player_history_read_model"') &&
    backendApiClient.includes('boundary["versionField"] = "timeline.generatedAt"') &&
    backendApiClient.includes('boundary["cacheInvalidationRule"] = "reject_older_timeline_generated_at"') &&
    backendApiClient.includes('boundary["staleResponseRejectedBy"] = "PlayerHistoryPanel._apply_player_history_backend_read_model"'),
  'Save/load display remains indirectly protected by the Stage 782 player-history read-model guard.',
)

assert.ok(
  refreshFromBackendSource.includes('_backend_api_client.get_player_history_read_model') &&
    refreshFromBackendSource.includes('_apply_player_history_backend_read_model(data)') &&
    !refreshFromBackendSource.includes('/api/save-slots'),
  'PlayerHistoryPanel normal refresh must consume /api/player-history, not direct save-slots routes.',
)

assert.ok(
  playerHistoryPanel.includes('_rebuild_save_load(_coerce_dictionary(_read_model.get("saveLoad", {})))') &&
    rebuildSaveLoadSource.includes('var slots := _coerce_array(save_load.get("slots", []))') &&
    rebuildSaveLoadSource.includes('button.pressed.connect(_on_save_slot_restore_pressed.bind(feedback, slot_summary))'),
  'Save/load UI must render saveLoad.slots from the player-history read model.',
)

assert.ok(
  restorePressedSource.includes('_save_restore_selected_slot_id = str(slot_summary.get("slotId", "")).strip_edges()') &&
    restorePressedSource.includes('_save_restore_feedback_text') &&
    !restorePressedSource.includes('/api/save-slots') &&
    !restorePressedSource.includes('_backend_api_client'),
  'Save-slot restore button is currently local preview feedback and must not be described as direct server restore consumption.',
)

assert.ok(
  read('godot-client/tools/run_mainline_visual_smoke.py').includes('"/api/save-slots/save"') &&
    read('godot-client/tools/run_mainline_visual_smoke.py').includes('history_data.get("saveLoad", {})'),
  'Visual smoke may seed save-slots through tooling, then validates player-facing saveLoad through /api/player-history.',
)

console.log('[godot_save_slots_direct_consumer_boundary_contract] all checks passed')
