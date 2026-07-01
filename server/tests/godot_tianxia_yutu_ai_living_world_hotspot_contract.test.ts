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

const hotspotPolicyPath = 'godot-client/scripts/map/tianxia_yutu_living_world_hotspot_policy.gd';
const hotspotPolicyAbsolutePath = path.join(repoRoot, hotspotPolicyPath);

assert.ok(
  fs.existsSync(hotspotPolicyAbsolutePath),
  'Tianxia Yutu must have a dedicated living-world hotspot policy helper instead of ad-hoc summary fields.',
);

const hotspotPolicySource = readSource(hotspotPolicyPath);
const mapGridSource = readSource('godot-client/scripts/map/map_grid.gd');
const mainSource = readSource('godot-client/scripts/app/main.gd');
const productAcceptanceSource = readSource(
  'godot-client/scripts/app/helpers/tianxia_yutu_product_acceptance_contract.gd',
);
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const overviewDrawSource = functionSource(
  mapGridSource,
  'func _draw_tianxia_yutu_overview_layer() -> bool:',
);
const hotspotDrawSource = functionSource(
  mapGridSource,
  'func _draw_tianxia_yutu_living_world_hotspots(draw_pos: Vector2, draw_size: Vector2) -> void:',
);
const mapSummarySource = functionSource(
  mapGridSource,
  'func get_main_map_streaming_debug_summary() -> Dictionary:',
);
const productAcceptanceActionSource = functionSource(
  mainSource,
  'func _press_mainline_visual_smoke_tianxia_yutu_product_acceptance_qa() -> Dictionary:',
);

for (const requiredPolicyNeedle of [
  'const LIVING_WORLD_MARKER_CLUSTER_TOKEN: String = "tianxia_yutu_living_world_marker_cluster_v1"',
  'const AI_ACTIVITY_LABEL_PRIORITY_TOKEN: String = "tianxia_yutu_ai_activity_label_priority_v1"',
  'static func build_hotspot_summary(',
]) {
  assert.ok(
    hotspotPolicySource.includes(requiredPolicyNeedle),
    `living-world hotspot policy helper is missing ${requiredPolicyNeedle}`,
  );
}

assert.ok(
  mapGridSource.includes(
    'const TianxiaYutuLivingWorldHotspotPolicyScript = preload("res://scripts/map/tianxia_yutu_living_world_hotspot_policy.gd")',
  ),
  'map_grid.gd must preload the Tianxia living-world hotspot policy helper.',
);

assert.ok(
  overviewDrawSource.includes('_draw_tianxia_yutu_living_world_hotspots(draw_pos, draw_size)'),
  'Tianxia overview drawing must render AI living-world hotspots before the focus marker.',
);
assert.ok(
  overviewDrawSource.indexOf('_draw_tianxia_yutu_frontline_markers(draw_pos, draw_size)') >= 0 &&
    overviewDrawSource.indexOf('_draw_tianxia_yutu_living_world_hotspots(draw_pos, draw_size)') >
      overviewDrawSource.indexOf('_draw_tianxia_yutu_frontline_markers(draw_pos, draw_size)') &&
    overviewDrawSource.indexOf('_draw_tianxia_yutu_focus_marker(draw_pos, draw_size)') >
      overviewDrawSource.indexOf('_draw_tianxia_yutu_living_world_hotspots(draw_pos, draw_size)'),
  'AI living-world hotspots should sit above strategic frontier overlays and below the selected focus marker.',
);

assert.ok(
  hotspotDrawSource.includes('WorldStore.get_ai_state(_resolve_human_faction_id())') &&
    hotspotDrawSource.includes('playerRuntimeExecutionTraceItems') &&
    hotspotDrawSource.includes('targetTileId') &&
    !hotspotDrawSource.includes('playerRuntimeProposalItems'),
  'Tianxia AI hotspots must read execution trace items directly and must not fall back to proposal markers.',
);

for (const requiredMapSummaryField of [
  '"tianxiaYutuLivingWorldMarkerClusterToken": TianxiaYutuLivingWorldHotspotPolicyScript.LIVING_WORLD_MARKER_CLUSTER_TOKEN',
  '"tianxiaYutuAiActivityLabelPriorityToken": TianxiaYutuLivingWorldHotspotPolicyScript.AI_ACTIVITY_LABEL_PRIORITY_TOKEN',
  '"tianxiaYutuAiActivityHotspotCount"',
  '"tianxiaYutuAiActivityHotspotDrawCount"',
  '"tianxiaYutuAiActivityHotspotLabelDrawCount"',
  '"tianxiaYutuAiActivityHotspotMaxClusterCount"',
  '"tianxiaYutuAiActivityHotspotFirstLabel"',
  '"tianxiaYutuAiActivityFirstTraceId"',
  '"tianxiaYutuAiActivityUsesExecutionTrace"',
  '"tianxiaYutuAiActivityFallbackUsed"',
]) {
  assert.ok(
    mapSummarySource.includes(requiredMapSummaryField),
    `map debug summary is missing ${requiredMapSummaryField}`,
  );
}

assert.ok(
  productAcceptanceActionSource.includes('_seed_mainline_visual_smoke_tianxia_yutu_living_world_hotspots(') &&
    productAcceptanceActionSource.includes(
      'compact_summary["tianxiaYutuLivingWorldMarkerClusterToken"]',
    ) &&
    productAcceptanceActionSource.includes(
      'compact_summary["tianxiaYutuAiActivityLabelPriorityToken"]',
    ) &&
    productAcceptanceActionSource.includes(
      'compact_summary["tianxiaYutuAiActivityFirstTraceId"]',
    ) &&
    productAcceptanceActionSource.includes(
      'compact_summary["tianxiaYutuAiActivityUsesExecutionTrace"]',
    ) &&
    productAcceptanceActionSource.includes('compact_summary["tianxiaYutuAiActivityFallbackUsed"]'),
  'product acceptance action must seed and carry living-world hotspot fields into compact summary.',
);

for (const requiredProductField of [
  'result["productAcceptanceLivingWorldMarkerClusterToken"]',
  'result["productAcceptanceAiActivityLabelPriorityToken"]',
  'result["productAcceptanceAiActivityHotspotCount"]',
  'result["productAcceptanceAiActivityHotspotDrawCount"]',
  'result["productAcceptanceAiActivityFirstTraceId"]',
  'result["productAcceptanceAiActivityUsesExecutionTrace"]',
  'result["productAcceptanceAiActivityFallbackUsed"]',
  '_living_world_hotspot_ok(compact_summary)',
]) {
  assert.ok(
    productAcceptanceSource.includes(requiredProductField),
    `product acceptance helper is missing ${requiredProductField}`,
  );
}

for (const closureNeedle of [
  'TIANXIA_YUTU_LIVING_WORLD_MARKER_CLUSTER_TOKEN = "tianxia_yutu_living_world_marker_cluster_v1"',
  'TIANXIA_YUTU_AI_ACTIVITY_LABEL_PRIORITY_TOKEN = "tianxia_yutu_ai_activity_label_priority_v1"',
  'productAcceptanceLivingWorldMarkerClusterToken!=tianxia_yutu_living_world_marker_cluster_v1',
  'productAcceptanceAiActivityLabelPriorityToken!=tianxia_yutu_ai_activity_label_priority_v1',
  'productAcceptanceAiActivityFirstTraceId=empty',
  'productAcceptanceAiActivityHotspotCount<=0',
  'productAcceptanceAiActivityHotspotDrawCount<=0',
  'productAcceptanceAiActivityUsesExecutionTrace!=true',
  'productAcceptanceAiActivityFallbackUsed!=false',
]) {
  assert.ok(closureBatchSource.includes(closureNeedle), `closure batch is missing ${closureNeedle}`);
}

console.log('[godot_tianxia_yutu_ai_living_world_hotspot_contract] all checks passed');
