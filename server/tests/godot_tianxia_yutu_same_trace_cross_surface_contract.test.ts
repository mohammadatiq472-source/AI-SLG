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

const hotspotPolicySource = readSource(
  'godot-client/scripts/map/tianxia_yutu_living_world_hotspot_policy.gd',
);
const mapGridSource = readSource('godot-client/scripts/map/map_grid.gd');
const mainSource = readSource('godot-client/scripts/app/main.gd');
const productAcceptanceSource = readSource(
  'godot-client/scripts/app/helpers/tianxia_yutu_product_acceptance_contract.gd',
);
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const hotspotDrawSource = functionSource(
  mapGridSource,
  'func _draw_tianxia_yutu_living_world_hotspots(draw_pos: Vector2, draw_size: Vector2) -> void:',
);
const mapSummarySource = functionSource(
  mapGridSource,
  'func get_main_map_streaming_debug_summary() -> Dictionary:',
);
const tianxiaTraceBuilderSource = functionSource(
  mainSource,
  'func _build_mainline_visual_smoke_tianxia_yutu_living_world_trace_items(ai_player_id: String, primary_trace_id: String = "") -> Array:',
);
const tianxiaSeedSource = functionSource(
  mainSource,
  'func _seed_mainline_visual_smoke_tianxia_yutu_living_world_hotspots(ai_player_id: String, primary_trace_id: String = "") -> void:',
);
const productAcceptanceActionSource = functionSource(
  mainSource,
  'func _press_mainline_visual_smoke_tianxia_yutu_product_acceptance_qa() -> Dictionary:',
);
const sameTraceActionSource = functionSource(
  mainSource,
  'func _press_mainline_visual_smoke_ai_activity_same_trace_cross_surface_fixture() -> Dictionary:',
);

assert.ok(
  hotspotPolicySource.includes('first_trace_id: String = ""') &&
    hotspotPolicySource.includes('"tianxiaYutuAiActivityFirstTraceId": first_trace_id.strip_edges()') &&
    hotspotPolicySource.includes(
      'str(summary.get("tianxiaYutuAiActivityFirstTraceId", "")).strip_edges() != ""',
    ),
  'Tianxia hotspot policy summary must expose and require the first execution trace id.',
);

assert.ok(
  mapGridSource.includes('var _last_tianxia_yutu_ai_activity_first_trace_id: String = ""') &&
    hotspotDrawSource.includes('_last_tianxia_yutu_ai_activity_first_trace_id') &&
    hotspotDrawSource.includes('traceId') &&
    mapSummarySource.includes(
      '"tianxiaYutuAiActivityFirstTraceId": _last_tianxia_yutu_ai_activity_first_trace_id',
    ),
  'map_grid.gd must carry the first Tianxia hotspot execution trace id into the streaming debug summary.',
);

assert.ok(
  tianxiaTraceBuilderSource.includes('primary_trace_id: String = ""') &&
    tianxiaTraceBuilderSource.includes('tianxia_primary_trace_id') &&
    tianxiaTraceBuilderSource.includes('trace_item["traceId"] = tianxia_primary_trace_id') &&
    tianxiaTraceBuilderSource.includes('second_trace_item["traceId"] = "%s_queue_2" % tianxia_primary_trace_id'),
  'Tianxia trace fixture builder must be able to reuse the same primary trace id as other AI surfaces.',
);

assert.ok(
  tianxiaSeedSource.includes('primary_trace_id: String = ""') &&
    tianxiaSeedSource.includes(
      '_build_mainline_visual_smoke_tianxia_yutu_living_world_trace_items(ai_player_id, primary_trace_id)',
    ),
  'Tianxia hotspot seeding must accept the cross-surface primary trace id.',
);

assert.ok(
  productAcceptanceActionSource.includes('compact_summary["tianxiaYutuAiActivityFirstTraceId"]') &&
    productAcceptanceSource.includes('result["productAcceptanceAiActivityFirstTraceId"]') &&
    closureBatchSource.includes('productAcceptanceAiActivityFirstTraceId=empty'),
  'Tianxia product acceptance must carry first trace id proof and closure must reject missing trace proof.',
);

assert.ok(
  sameTraceActionSource.includes(
    '_seed_mainline_visual_smoke_tianxia_yutu_living_world_hotspots(ai_player_id, expected_trace_id)',
  ) &&
    sameTraceActionSource.includes('tianxiaYutuAiActivityFirstTraceId') &&
    sameTraceActionSource.includes('"tianxia_yutu": tianxia_trace_id') &&
    sameTraceActionSource.includes('aiActivitySameTraceTianxiaTraceId') &&
    sameTraceActionSource.includes('same_trace_surface_count >= 5'),
  'same-trace fixture action must prove the same trace across AI panel, main world, battle report, chat, and Tianxia Yutu.',
);

assert.ok(
  visualSmokeSource.includes('"aiActivitySameTraceTianxiaTraceId"') &&
    closureBatchSource.includes('"aiActivitySameTraceTianxiaTraceId"') &&
    closureBatchSource.includes('aiActivitySameTraceSurfaceCount<5'),
  'formal visual smoke and closure batch must require Tianxia in the same-trace cross-surface contract.',
);

console.log('[godot_tianxia_yutu_same_trace_cross_surface_contract] all checks passed');
