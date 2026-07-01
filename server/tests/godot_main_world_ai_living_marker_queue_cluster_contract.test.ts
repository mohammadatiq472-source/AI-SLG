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

const aiMapIntentMarkerSource = readSource('godot-client/scripts/map/ai_map_intent_marker.gd');
const unitViewLayerSource = readSource('godot-client/scripts/map/unit_view_layer.gd');
const mainSource = readSource('godot-client/scripts/app/main.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const drawLivingMarkerSource = functionSource(
  aiMapIntentMarkerSource,
  'func _draw_living_activity_marker(color: Color) -> void:',
);
const collectLivingMarkersSource = functionSource(
  unitViewLayerSource,
  'func _collect_ai_living_activity_markers_from_execution_trace(trace_items: Array, markers: Dictionary) -> int:',
);
const syncAiMapVisualsSource = functionSource(
  unitViewLayerSource,
  'func _sync_ai_map_visuals(world_payload: Dictionary) -> void:',
);
const summarySource = functionSource(
  unitViewLayerSource,
  'func get_visual_acceptance_summary() -> Dictionary:',
);
const fixtureTraceSource = functionSource(
  mainSource,
  'func _build_mainline_visual_smoke_world_ai_living_activity_trace_items(ai_player_id: String) -> Array:',
);

assert.ok(
  aiMapIntentMarkerSource.includes(
    'const AI_LIVING_ACTIVITY_MARKER_QUEUE_CLUSTER_CONTRACT := "ai_living_activity_marker_queue_cluster_v1"',
  ),
  'AIMapIntentMarker must expose the living marker queue/cluster contract token.',
);

for (const requiredVar of [
  'var _queue_count: int',
  'var _aggregation_dot_count: int',
]) {
  assert.ok(aiMapIntentMarkerSource.includes(requiredVar), `AIMapIntentMarker is missing ${requiredVar}`);
}

assert.ok(
  aiMapIntentMarkerSource.includes(
    'func set_living_activity_queue_cluster(queue_count: int, aggregation_dot_count: int) -> void:',
  ) &&
    aiMapIntentMarkerSource.includes('func _draw_living_activity_queue_count_pill() -> void:') &&
    aiMapIntentMarkerSource.includes('func _draw_living_activity_aggregation_dots() -> void:') &&
    aiMapIntentMarkerSource.includes('ThemeDB.fallback_font'),
  'AIMapIntentMarker must accept and render queue count plus aggregation dots.',
);

assert.ok(
  drawLivingMarkerSource.includes('_draw_living_activity_queue_count_pill()') &&
    drawLivingMarkerSource.includes('_draw_living_activity_aggregation_dots()'),
  'living-activity marker drawing must include queue count and aggregation dots.',
);

assert.ok(
  unitViewLayerSource.includes(
    'const AI_LIVING_ACTIVITY_MARKER_QUEUE_CLUSTER_CONTRACT := "ai_living_activity_marker_queue_cluster_v1"',
  ) &&
    unitViewLayerSource.includes(
      'func _count_ai_living_activity_trace_items_for_tile(trace_items: Array, target_tile_id: String) -> int:',
    ) &&
    unitViewLayerSource.includes(
      'func _resolve_ai_living_activity_aggregation_dot_count(queue_count: int) -> int:',
    ),
  'UnitViewLayer must expose queue/cluster contract and derive same-tile queue counts from execution trace data.',
);

for (const requiredPayloadField of ['"queueCount"', '"aggregationDotCount"']) {
  assert.ok(
    collectLivingMarkersSource.includes(requiredPayloadField),
    `living marker trace collector must emit ${requiredPayloadField}`,
  );
}

assert.ok(
  syncAiMapVisualsSource.includes('set_living_activity_queue_cluster') &&
    syncAiMapVisualsSource.includes('marker_meta.get("queueCount", 1)') &&
    syncAiMapVisualsSource.includes('marker_meta.get("aggregationDotCount", 0)'),
  'UnitViewLayer must pass queue count and aggregation dot count into the map marker instance.',
);

for (const requiredSummaryField of [
  '"aiLivingActivityMarkerQueueClusterContract": AI_LIVING_ACTIVITY_MARKER_QUEUE_CLUSTER_CONTRACT',
  '"aiLivingActivityMarkerQueueCountVisibleCount"',
  '"aiLivingActivityMarkerMaxQueueCount"',
  '"aiLivingActivityMarkerAggregationDotVisibleCount"',
  '"aiLivingActivityMarkerMaxAggregationDotCount"',
]) {
  assert.ok(summarySource.includes(requiredSummaryField), `visual debug summary is missing ${requiredSummaryField}`);
}

assert.ok(
  fixtureTraceSource.includes('trace_visual_smoke_world_living_activity_queue_2') &&
    fixtureTraceSource.includes('trace_items.append(second_trace_item)') &&
    fixtureTraceSource.includes('second_trace_item["targetTileId"] = fixture_tile_id'),
  'formal fixture must seed a second trace item on the same target tile so queue/aggregation visuals are proven.',
);

assert.ok(
  visualSmokeSource.includes('"world_ai_living_activity_layer_fixture"') &&
    visualSmokeSource.includes('aiLivingActivityMarkerQueueClusterContract') &&
    visualSmokeSource.includes('aiLivingActivityMarkerQueueCountVisibleCount') &&
    visualSmokeSource.includes('aiLivingActivityMarkerAggregationDotVisibleCount'),
  'visual smoke runner must retain living-marker queue/aggregation summary fields.',
);

for (const closureNeedle of [
  'aiLivingActivityMarkerQueueClusterContract!=ai_living_activity_marker_queue_cluster_v1',
  'aiLivingActivityMarkerQueueCountVisibleCount<=0',
  'aiLivingActivityMarkerMaxQueueCount<2',
  'aiLivingActivityMarkerAggregationDotVisibleCount<=0',
  'aiLivingActivityMarkerMaxAggregationDotCount<=0',
]) {
  assert.ok(closureBatchSource.includes(closureNeedle), `closure batch is missing ${closureNeedle}`);
}

console.log('[godot_main_world_ai_living_marker_queue_cluster_contract] all checks passed');
