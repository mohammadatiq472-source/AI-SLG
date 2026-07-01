import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const functionSource = (source: string, signature: string): string => {
  const start = source.indexOf(signature);
  if (start < 0) {
    return '';
  }
  const nextFunc = source.indexOf('\nfunc ', start + signature.length);
  const nextStaticFunc = source.indexOf('\nstatic func ', start + signature.length);
  const candidates = [nextFunc, nextStaticFunc].filter((index) => index > start);
  const end = candidates.length > 0 ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
};

const carryingTroopsChipContract = 'ai_activity_carrying_troops_chip_v1';
const markerStripContract = 'ai_living_activity_marker_carrying_troops_strip_v1';
const generatedTroopSource = 'generated_troops_illustration_v1';

const factorySource = readSource('godot-client/scripts/ui/slg_ui_component_factory.gd');
const markerSource = readSource('godot-client/scripts/map/ai_map_intent_marker.gd');
const unitViewLayerSource = readSource('godot-client/scripts/map/unit_view_layer.gd');
const mainSource = readSource('godot-client/scripts/app/main.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');
const troopReadModel = readSource('godot-client/data/ui/main_city_troop_formation_read_model.json');

const markerDrawSource = functionSource(markerSource, 'func _draw_living_activity_marker(color: Color) -> void:');
const markerDebugSource = functionSource(markerSource, 'func get_visual_debug_state() -> Dictionary:');
const resolveSlotsSource = functionSource(
  unitViewLayerSource,
  'func _resolve_ai_living_activity_marker_carrying_troop_slots(ai_player_id: String) -> Array:',
);
const collectTraceSource = functionSource(
  unitViewLayerSource,
  'func _collect_ai_living_activity_markers_from_execution_trace(trace_items: Array, markers: Dictionary) -> int:',
);
const summarySource = functionSource(unitViewLayerSource, 'func get_visual_acceptance_summary() -> Dictionary:');
const fixtureSource = functionSource(mainSource, 'func _press_mainline_visual_smoke_world_ai_living_activity_layer_fixture() -> Dictionary:');

assert.ok(
  factorySource.includes(`const AI_ACTIVITY_CARRYING_TROOPS_CHIP_CONTRACT := "${carryingTroopsChipContract}"`) &&
    factorySource.includes(`const GENERATED_TROOPS_ILLUSTRATION_SOURCE := "${generatedTroopSource}"`) &&
    factorySource.includes('static func generated_troop_illustration_for_label(troop_label: String) -> String:'),
  'main-world marker carrying troops strip must reuse the Stage 49 generated_troops mapping, not invent another asset map.',
);

assert.ok(
  troopReadModel.includes('"ai_player_id": "ai_player_jihan_vanguard"') &&
    troopReadModel.includes('"troop_type": "步兵"') &&
    troopReadModel.includes('"troop_type": "骑兵"') &&
    troopReadModel.includes('"troop_type": "枪兵"'),
  'main-world marker carrying troops strip must have a stable AI-owned formation read-model source.',
);

assert.ok(
  markerSource.includes(`const AI_LIVING_ACTIVITY_MARKER_CARRYING_TROOPS_STRIP_CONTRACT := "${markerStripContract}"`) &&
    markerSource.includes('func set_living_activity_carrying_troops_slots(slots: Array) -> void:') &&
    markerSource.includes('var _carrying_troops_slots: Array = []') &&
    markerSource.includes('var _carrying_troops_texture_draw_count: int = 0'),
  'AIMapIntentMarker must own a marker-local carrying troops strip contract and state.',
);

assert.ok(
  markerDrawSource.includes('_draw_living_activity_carrying_troops_strip()') &&
    markerSource.includes('func _draw_living_activity_carrying_troops_strip() -> void:') &&
    markerSource.includes('draw_texture_rect') &&
    markerSource.includes('generated_troops_illustration_source') &&
    markerSource.includes('ai_activity_carrying_troops_chip_contract'),
  'AIMapIntentMarker must draw a marker-local generated_troops strip instead of only opening the activity card.',
);

assert.ok(
  markerDebugSource.includes('aiLivingActivityMarkerCarryingTroopsStripContract') &&
    markerDebugSource.includes('aiLivingActivityMarkerCarryingTroopsGeneratedAssetSource') &&
    markerDebugSource.includes('aiLivingActivityMarkerCarryingTroopsSlotCount') &&
    markerDebugSource.includes('aiLivingActivityMarkerCarryingTroopsTextureDrawCount') &&
    markerDebugSource.includes('aiLivingActivityMarkerCarryingTroopsLabels') &&
    markerDebugSource.includes('aiLivingActivityMarkerCarryingTroopsAssetPaths'),
  'AIMapIntentMarker debug state must expose marker-local carrying troops strip fields.',
);

assert.ok(
  unitViewLayerSource.includes('const SlgUiComponentFactoryScript = preload("res://scripts/ui/slg_ui_component_factory.gd")') &&
    unitViewLayerSource.includes('MAIN_CITY_TROOP_FORMATION_READ_MODEL_PATH') &&
    resolveSlotsSource.includes('main_city_troop_formation_read_model.json') &&
    resolveSlotsSource.includes('ai_player_jihan_vanguard') &&
    resolveSlotsSource.includes('owner_type') &&
    resolveSlotsSource.includes('troop_type') &&
    resolveSlotsSource.includes('general_name') &&
    resolveSlotsSource.includes('generated_troop_illustration_for_label'),
  'UnitViewLayer must resolve marker carrying troops from the AI-owned formation read model.',
);

assert.ok(
  collectTraceSource.includes('_resolve_ai_living_activity_marker_carrying_troop_slots(ai_player_id)') &&
    unitViewLayerSource.includes('set_living_activity_carrying_troops_slots') &&
    unitViewLayerSource.includes('"carryingTroopsSlots"'),
  'UnitViewLayer must pass the resolved troop slots into each living activity marker.',
);

assert.ok(
  summarySource.includes('aiLivingActivityMarkerCarryingTroopsStripContract') &&
    summarySource.includes('aiLivingActivityMarkerCarryingTroopsGeneratedAssetSource') &&
    summarySource.includes('aiLivingActivityMarkerCarryingTroopsStripVisibleCount') &&
    summarySource.includes('aiLivingActivityMarkerCarryingTroopsSlotCount') &&
    summarySource.includes('aiLivingActivityMarkerCarryingTroopsTextureDrawCount') &&
    summarySource.includes('aiLivingActivityMarkerCarryingTroopsLabels') &&
    summarySource.includes('aiLivingActivityMarkerCarryingTroopsAssetPaths'),
  'UnitViewLayer summary must aggregate marker-local carrying troops strip proof fields.',
);

for (const requiredField of [
  'aiLivingActivityMarkerCarryingTroopsStripContract',
  'aiLivingActivityMarkerCarryingTroopsGeneratedAssetSource',
  'aiLivingActivityMarkerCarryingTroopsStripVisibleCount',
  'aiLivingActivityMarkerCarryingTroopsSlotCount',
  'aiLivingActivityMarkerCarryingTroopsTextureDrawCount',
  'aiLivingActivityMarkerCarryingTroopsLabels',
]) {
  assert.ok(fixtureSource.includes(requiredField), `world fixture result is missing ${requiredField}`);
  assert.ok(visualSmokeSource.includes(requiredField), `visual smoke required fields are missing ${requiredField}`);
}

for (const closureNeedle of [
  'aiLivingActivityMarkerCarryingTroopsStripContract!=ai_living_activity_marker_carrying_troops_strip_v1',
  'aiLivingActivityMarkerCarryingTroopsGeneratedAssetSource!=generated_troops_illustration_v1',
  'aiLivingActivityMarkerCarryingTroopsStripVisibleCount<=0',
  'aiLivingActivityMarkerCarryingTroopsSlotCount<3',
  'aiLivingActivityMarkerCarryingTroopsTextureDrawCount<3',
  'aiLivingActivityMarkerCarryingTroopsLabels=empty',
]) {
  assert.ok(closureBatchSource.includes(closureNeedle), `closure batch is missing ${closureNeedle}`);
}

assert.ok(
  unitViewLayerSource.includes('MAIN_WORLD_UNIT_VISUAL_ANCHOR_CONFIG_PATH') &&
    !unitViewLayerSource.includes('generated_troops/illustrations/foreground/infantry_unit_fg.png" # unit marker replacement'),
  'this contract must not replace the existing unit-frame/anchor manifest chain for normal unit markers.',
);

console.log('[godot_main_world_ai_living_marker_carrying_troops_contract] all checks passed');
