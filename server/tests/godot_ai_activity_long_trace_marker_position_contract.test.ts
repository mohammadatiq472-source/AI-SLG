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
  const end = source.indexOf('\nfunc ', start + signature.length);
  return source.slice(start, end > start ? end : source.length);
};

const unitViewLayerSource = readSource('godot-client/scripts/map/unit_view_layer.gd');
const mainSource = readSource('godot-client/scripts/app/main.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const summarySource = functionSource(
  unitViewLayerSource,
  'func get_visual_acceptance_summary() -> Dictionary:',
);
const syncAiMapVisualsSource = functionSource(
  unitViewLayerSource,
  'func _sync_ai_map_visuals(world_payload: Dictionary) -> void:',
);
const syncAiMapVisualPositionsSource = functionSource(
  unitViewLayerSource,
  'func _sync_ai_map_visual_positions() -> void:',
);
const clampSource = functionSource(
  unitViewLayerSource,
  'func _clamp_ai_living_activity_marker_position_to_viewport(',
);
const fixtureTraceSource = functionSource(
  mainSource,
  'func _build_mainline_visual_smoke_world_ai_living_activity_trace_items(ai_player_id: String) -> Array:',
);
const fixturePressSource = functionSource(
  mainSource,
  'func _press_mainline_visual_smoke_world_ai_living_activity_layer_fixture() -> Dictionary:',
);

assert.ok(
  unitViewLayerSource.includes(
    'const AI_LIVING_ACTIVITY_LONG_TRACE_POSITION_CONTRACT := "ai_living_activity_long_trace_position_v1"',
  ),
  'UnitViewLayer must expose a stable long-trace / separated-position contract token.',
);

for (const requiredSummaryField of [
  '"aiLivingActivityLongTracePositionContract": AI_LIVING_ACTIVITY_LONG_TRACE_POSITION_CONTRACT',
  '"aiLivingActivityRouteTraceStepCount"',
  '"aiLivingActivityDistinctTargetTileCount"',
  '"aiLivingActivitySeparatedMarkerPositionCount"',
  '"aiLivingActivitySeparatedMarkerPositionOk"',
]) {
  assert.ok(summarySource.includes(requiredSummaryField), `UnitViewLayer summary is missing ${requiredSummaryField}`);
}

assert.ok(
  syncAiMapVisualsSource.includes('living_activity_clamp_index_by_tile')
    && syncAiMapVisualsSource.includes('_resolve_ai_living_activity_clamp_lane_index(')
    && syncAiMapVisualsSource.includes('_clamp_ai_living_activity_marker_position_to_viewport(next_position, clamp_lane_index)'),
  'initial AI marker sync must assign stable clamp lanes per target tile before viewport clamping.',
);
assert.ok(
  syncAiMapVisualPositionsSource.includes('living_activity_clamp_index_by_tile')
    && syncAiMapVisualPositionsSource.includes('_resolve_ai_living_activity_clamp_lane_index(')
    && syncAiMapVisualPositionsSource.includes('_clamp_ai_living_activity_marker_position_to_viewport(next_position, clamp_lane_index)'),
  'AI marker position refresh must preserve the same target-tile clamp lane behavior.',
);
assert.ok(
  clampSource.includes('clamp_lane_index: int = 0')
    && clampSource.includes('lane_y_offset')
    && clampSource.includes('clamped_position.y + lane_y_offset'),
  'viewport clamping must offset separate target-tile lanes so offscreen markers do not collapse to one point.',
);

assert.ok(
  fixtureTraceSource.includes('trace_visual_smoke_world_living_activity_route_3')
    && fixtureTraceSource.includes('third_trace_item["targetTileId"] = "tile_10"')
    && fixtureTraceSource.includes('trace_items.append(third_trace_item)'),
  'formal AI activity fixture must seed a third trace item on a separate target tile.',
);

for (const requiredResultField of [
  'aiLivingActivityLongTracePositionContract',
  'aiLivingActivityRouteTraceStepCount',
  'aiLivingActivityDistinctTargetTileCount',
  'aiLivingActivitySeparatedMarkerPositionCount',
  'aiLivingActivitySeparatedMarkerPositionOk',
]) {
  assert.ok(fixturePressSource.includes(requiredResultField), `fixture result must expose ${requiredResultField}.`);
  assert.ok(
    visualSmokeSource.includes(`"${requiredResultField}"`),
    `visual smoke runner must require ${requiredResultField}.`,
  );
}

for (const closureNeedle of [
  'aiLivingActivityLongTracePositionContract!=ai_living_activity_long_trace_position_v1',
  'aiLivingActivityRouteTraceStepCount<3',
  'aiLivingActivityDistinctTargetTileCount<2',
  'aiLivingActivitySeparatedMarkerPositionCount<2',
  'aiLivingActivitySeparatedMarkerPositionOk!=true',
]) {
  assert.ok(closureBatchSource.includes(closureNeedle), `closure batch is missing ${closureNeedle}`);
}

console.log('[godot_ai_activity_long_trace_marker_position_contract] all checks passed');
