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

const queuedArrowRelativePath =
  'godot-client/assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_route_arrow_queued_v1.png';
const activeArrowResPath =
  'res://assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_route_arrow_v1.png';
const queuedArrowResPath =
  'res://assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_route_arrow_queued_v1.png';
const manifestRelativePath =
  'godot-client/assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_manifest_v1.json';
const routeStateVariantContract = 'tianxia_yutu_ai_route_state_variant_v1';

assert.ok(fs.existsSync(path.join(repoRoot, queuedArrowRelativePath)), `${queuedArrowRelativePath} must exist.`);
assert.ok(
  fs.existsSync(path.join(repoRoot, `${queuedArrowRelativePath}.import`)),
  `${queuedArrowRelativePath}.import must exist.`,
);

const manifest = JSON.parse(readSource(manifestRelativePath));
assert.equal(manifest.routeStateVariantContractId, routeStateVariantContract);
assert.equal(manifest.assets?.routeArrow?.path, activeArrowResPath);
assert.equal(manifest.assets?.routeQueuedArrow?.path, queuedArrowResPath);
assert.equal(manifest.assets?.routeQueuedArrow?.role, 'ai_activity_route_queued_arrow');
assert.equal(manifest.assets?.routeQueuedArrow?.sizePx?.[0], 72);
assert.equal(manifest.assets?.routeQueuedArrow?.sizePx?.[1], 24);

const hotspotPolicySource = readSource('godot-client/scripts/map/tianxia_yutu_living_world_hotspot_policy.gd');
const mapGridSource = readSource('godot-client/scripts/map/map_grid.gd');
const mainSource = readSource('godot-client/scripts/app/main.gd');
const productAcceptanceSource = readSource(
  'godot-client/scripts/app/helpers/tianxia_yutu_product_acceptance_contract.gd',
);
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const drawHotspotsSource = functionSource(
  mapGridSource,
  'func _draw_tianxia_yutu_living_world_hotspots(draw_pos: Vector2, draw_size: Vector2) -> void:',
);
const summarySource = functionSource(
  mapGridSource,
  'func get_main_map_streaming_debug_summary() -> Dictionary:',
);
const productAcceptanceActionSource = functionSource(
  mainSource,
  'func _press_mainline_visual_smoke_tianxia_yutu_product_acceptance_qa() -> Dictionary:',
);
const fixtureSource = functionSource(
  mainSource,
  'func _build_mainline_visual_smoke_tianxia_yutu_living_world_trace_items(ai_player_id: String, primary_trace_id: String = "") -> Array:',
);

for (const requiredPolicyNeedle of [
  `const HOTSPOT_ROUTE_STATE_VARIANT_CONTRACT: String = "${routeStateVariantContract}"`,
  `const HOTSPOT_ROUTE_ACTIVE_ARROW_ASSET_PATH: String = "${activeArrowResPath}"`,
  `const HOTSPOT_ROUTE_QUEUED_ARROW_ASSET_PATH: String = "${queuedArrowResPath}"`,
  'static func route_state_variant_summary_ok(summary: Dictionary) -> bool:',
  '"tianxiaYutuAiActivityRouteStateVariantContract": HOTSPOT_ROUTE_STATE_VARIANT_CONTRACT',
  '"tianxiaYutuAiActivityRouteActiveArrowAssetPath": HOTSPOT_ROUTE_ACTIVE_ARROW_ASSET_PATH',
  '"tianxiaYutuAiActivityRouteQueuedArrowAssetPath": HOTSPOT_ROUTE_QUEUED_ARROW_ASSET_PATH',
  '"tianxiaYutuAiActivityRouteStateVariantAssetLoaded": route_state_variant_asset_loaded',
  '"tianxiaYutuAiActivityRouteActiveVariantDrawCount": active_variant_draw_count',
  '"tianxiaYutuAiActivityRouteQueuedVariantDrawCount": queued_variant_draw_count',
  '"tianxiaYutuAiActivityRouteFirstStateVariant": first_state_variant.strip_edges()',
]) {
  assert.ok(
    hotspotPolicySource.includes(requiredPolicyNeedle),
    `hotspot policy is missing ${requiredPolicyNeedle}`,
  );
}

for (const requiredMapNeedle of [
  'var _tianxia_yutu_ai_activity_route_queued_arrow_texture: Texture2D = null',
  'var _last_tianxia_yutu_ai_activity_route_state_variant_asset_loaded: bool = false',
  'var _last_tianxia_yutu_ai_activity_route_active_variant_draw_count: int = 0',
  'var _last_tianxia_yutu_ai_activity_route_queued_variant_draw_count: int = 0',
  'var _last_tianxia_yutu_ai_activity_route_first_state_variant: String = ""',
  'func _resolve_tianxia_yutu_ai_activity_route_state_variant(trace_item: Dictionary, marker_payload: Dictionary) -> String:',
  'func _draw_tianxia_yutu_ai_activity_route_arrow_asset(arrow_pos: Vector2, route_heading: float, state_variant: String) -> bool:',
  '_draw_tianxia_yutu_ai_activity_route_arrow_asset(arrow_pos, route_heading, state_variant)',
]) {
  assert.ok(mapGridSource.includes(requiredMapNeedle), `map grid is missing ${requiredMapNeedle}`);
}

assert.ok(
  drawHotspotsSource.includes('"routeItems"') &&
    drawHotspotsSource.includes('route_items.append({') &&
    drawHotspotsSource.includes('"stateVariant": _resolve_tianxia_yutu_ai_activity_route_state_variant(trace_item, marker_payload)') &&
    drawHotspotsSource.includes('_last_tianxia_yutu_ai_activity_route_active_variant_draw_count += 1') &&
    drawHotspotsSource.includes('_last_tianxia_yutu_ai_activity_route_queued_variant_draw_count += 1'),
  'Tianxia route drawing must preserve per-trace active/queued route items and count both variants.',
);

for (const requiredSummaryField of [
  '"tianxiaYutuAiActivityRouteStateVariantContract": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_ROUTE_STATE_VARIANT_CONTRACT',
  '"tianxiaYutuAiActivityRouteActiveArrowAssetPath": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_ROUTE_ACTIVE_ARROW_ASSET_PATH',
  '"tianxiaYutuAiActivityRouteQueuedArrowAssetPath": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_ROUTE_QUEUED_ARROW_ASSET_PATH',
  '"tianxiaYutuAiActivityRouteStateVariantAssetLoaded": _last_tianxia_yutu_ai_activity_route_state_variant_asset_loaded',
  '"tianxiaYutuAiActivityRouteActiveVariantDrawCount": _last_tianxia_yutu_ai_activity_route_active_variant_draw_count',
  '"tianxiaYutuAiActivityRouteQueuedVariantDrawCount": _last_tianxia_yutu_ai_activity_route_queued_variant_draw_count',
  '"tianxiaYutuAiActivityRouteFirstStateVariant": _last_tianxia_yutu_ai_activity_route_first_state_variant',
]) {
  assert.ok(summarySource.includes(requiredSummaryField), `map summary is missing ${requiredSummaryField}`);
}

assert.ok(
  fixtureSource.includes('second_marker_payload["kind"] = "queued"') &&
    fixtureSource.includes('second_trace_item["executionState"] = "queued"') &&
    fixtureSource.includes('second_trace_item["sourceCell"] = queued_source_cell.duplicate(true)'),
  'Tianxia visual fixture must seed an explicit queued route variant without losing cluster proof.',
);

for (const requiredProductCopy of [
  'compact_summary["tianxiaYutuAiActivityRouteStateVariantContract"]',
  'compact_summary["tianxiaYutuAiActivityRouteActiveArrowAssetPath"]',
  'compact_summary["tianxiaYutuAiActivityRouteQueuedArrowAssetPath"]',
  'compact_summary["tianxiaYutuAiActivityRouteStateVariantAssetLoaded"]',
  'compact_summary["tianxiaYutuAiActivityRouteActiveVariantDrawCount"]',
  'compact_summary["tianxiaYutuAiActivityRouteQueuedVariantDrawCount"]',
  'compact_summary["tianxiaYutuAiActivityRouteFirstStateVariant"]',
]) {
  assert.ok(
    productAcceptanceActionSource.includes(requiredProductCopy),
    `product acceptance action must carry ${requiredProductCopy}`,
  );
}

for (const requiredHelperNeedle of [
  'result["productAcceptanceAiActivityRouteStateVariantContract"]',
  'result["productAcceptanceAiActivityRouteActiveArrowAssetPath"]',
  'result["productAcceptanceAiActivityRouteQueuedArrowAssetPath"]',
  'result["productAcceptanceAiActivityRouteStateVariantAssetLoaded"]',
  'result["productAcceptanceAiActivityRouteActiveVariantDrawCount"]',
  'result["productAcceptanceAiActivityRouteQueuedVariantDrawCount"]',
  'result["productAcceptanceAiActivityRouteFirstStateVariant"]',
  'TianxiaYutuLivingWorldHotspotPolicyScript.route_state_variant_summary_ok(compact_summary)',
]) {
  assert.ok(
    productAcceptanceSource.includes(requiredHelperNeedle),
    `product acceptance helper is missing ${requiredHelperNeedle}`,
  );
}

for (const closureNeedle of [
  'TIANXIA_YUTU_AI_ROUTE_STATE_VARIANT_TOKEN = "tianxia_yutu_ai_route_state_variant_v1"',
  'productAcceptanceAiActivityRouteStateVariantContract!=tianxia_yutu_ai_route_state_variant_v1',
  'productAcceptanceAiActivityRouteStateVariantAssetLoaded!=true',
  'productAcceptanceAiActivityRouteActiveVariantDrawCount<=0',
  'productAcceptanceAiActivityRouteQueuedVariantDrawCount<=0',
]) {
  assert.ok(closureBatchSource.includes(closureNeedle), `closure batch is missing ${closureNeedle}`);
}

console.log('[godot_tianxia_yutu_ai_route_state_variant_contract] all checks passed');
