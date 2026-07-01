import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const backendApiClientSource = readFileSync('godot-client/scripts/infra/http/backend_api_client.gd', 'utf-8')
const mainSource = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')

assert.ok(
  backendApiClientSource.includes('func record_world_task_event('),
  'BackendApiClient must expose a typed record_world_task_event helper.',
)
assert.ok(
  backendApiClientSource.includes('post_world_action("recordWorldTaskEvent"'),
  'BackendApiClient record_world_task_event must call the authoritative world/action recordWorldTaskEvent helper.',
)
assert.ok(
  backendApiClientSource.includes('"source": source'),
  'BackendApiClient record_world_task_event must forward the authority source.',
)
assert.ok(
  mainSource.includes('func _record_world_task_event_from_ui('),
  'main.gd must expose one UI helper for recording world task ledger events.',
)
assert.ok(
  mainSource.includes('huangtian_task_04_register_militia') &&
    mainSource.includes('troop_formation_viewed') &&
    mainSource.includes('godot_main_city_troop_formation_viewed'),
  'Godot troop formation open/submit path must record the chapter-2 troop formation viewed task event.',
)
assert.ok(
  mainSource.includes('huangtian_task_05_drill_ground') &&
    mainSource.includes('troop_formation_prepared') &&
    mainSource.includes('godot_main_city_troop_formation_submitted'),
  'Godot troop formation submit path must record the chapter-2 troop formation prepared task event.',
)
assert.ok(
  mainSource.includes('huangtian_task_09_mark_supply_route') &&
    mainSource.includes('battle_report_opened') &&
    mainSource.includes('godot_battle_report_detail_opened'),
  'Godot battle report detail path must record the chapter-3 battle report opened task event.',
)
assert.ok(
  mainSource.includes('worldTaskEventLedgerResults'),
  'Godot smoke summary must expose worldTaskEventLedgerResults for validation.',
)

console.log('[godot_world_task_event_ledger_ui_contract] all checks passed')
