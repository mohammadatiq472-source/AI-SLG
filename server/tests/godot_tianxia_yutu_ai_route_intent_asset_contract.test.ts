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

const routeArrowRelativePath =
  'godot-client/assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_route_arrow_v1.png';
const routeArrowResPath =
  'res://assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_route_arrow_v1.png';
const manifestRelativePath =
  'godot-client/assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_manifest_v1.json';
const routeIntentAssetContract = 'tianxia_yutu_ai_route_intent_asset_v1';

assert.ok(fs.existsSync(path.join(repoRoot, routeArrowRelativePath)), `${routeArrowRelativePath} must exist.`);
assert.ok(
  fs.existsSync(path.join(repoRoot, `${routeArrowRelativePath}.import`)),
  `${routeArrowRelativePath}.import must exist.`,
);

const manifest = JSON.parse(readSource(manifestRelativePath));
assert.equal(manifest.routeIntentContractId, routeIntentAssetContract);
assert.equal(manifest.assets?.routeArrow?.path, routeArrowResPath);
assert.equal(manifest.assets?.routeArrow?.role, 'ai_activity_route_intent_arrow');
assert.equal(manifest.assets?.routeArrow?.sizePx?.[0], 72);
assert.equal(manifest.assets?.routeArrow?.sizePx?.[1], 24);

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

for (const requiredPolicyNeedle of [
  `const HOTSPOT_ROUTE_INTENT_ASSET_CONTRACT: String = "${routeIntentAssetContract}"`,
  `const HOTSPOT_ROUTE_ARROW_ASSET_PATH: String = "${routeArrowResPath}"`,
  'static func route_intent_asset_summary_ok(summary: Dictionary) -> bool:',
  '"tianxiaYutuAiActivityRouteIntentAssetContract": HOTSPOT_ROUTE_INTENT_ASSET_CONTRACT',
  '"tianxiaYutuAiActivityRouteArrowAssetPath": HOTSPOT_ROUTE_ARROW_ASSET_PATH',
  '"tianxiaYutuAiActivityRouteIntentAssetLoaded": route_intent_asset_loaded',
  '"tianxiaYutuAiActivityRouteIntentSourceTargetCount": source_target_count',
  '"tianxiaYutuAiActivityRouteIntentLineDrawCount": route_line_draw_count',
  '"tianxiaYutuAiActivityRouteIntentArrowAssetDrawCount": route_arrow_asset_draw_count',
]) {
  assert.ok(
    hotspotPolicySource.includes(requiredPolicyNeedle),
    `hotspot policy is missing ${requiredPolicyNeedle}`,
  );
}

for (const requiredMapNeedle of [
  'var _tianxia_yutu_ai_activity_route_arrow_texture: Texture2D = null',
  'var _last_tianxia_yutu_ai_activity_route_intent_asset_loaded: bool = false',
  'var _last_tianxia_yutu_ai_activity_route_intent_source_target_count: int = 0',
  'var _last_tianxia_yutu_ai_activity_route_intent_line_draw_count: int = 0',
  'var _last_tianxia_yutu_ai_activity_route_intent_arrow_asset_draw_count: int = 0',
  'func _load_tianxia_yutu_ai_activity_route_intent_textures() -> void:',
  'func _resolve_tianxia_yutu_ai_activity_hotspot_source_cell(trace_item: Dictionary, marker_payload: Dictionary) -> Dictionary:',
  'func _draw_tianxia_yutu_ai_activity_route_intent(source_point: Vector2, target_point: Vector2) -> bool:',
  'func _draw_tianxia_yutu_ai_activity_route_arrow_asset(arrow_pos: Vector2, route_heading: float, state_variant: String) -> bool:',
  '_draw_tianxia_yutu_ai_activity_route_intent(source_point, point)',
]) {
  assert.ok(mapGridSource.includes(requiredMapNeedle), `map grid is missing ${requiredMapNeedle}`);
}

assert.ok(
  drawHotspotsSource.includes('_last_tianxia_yutu_ai_activity_route_intent_source_target_count += 1') &&
    drawHotspotsSource.includes('_last_tianxia_yutu_ai_activity_route_intent_line_draw_count += 1') &&
    drawHotspotsSource.includes('_last_tianxia_yutu_ai_activity_route_intent_arrow_asset_draw_count += 1'),
  'Tianxia hotspot drawing must count source-target route line and arrow asset draws.',
);

for (const requiredSummaryField of [
  '"tianxiaYutuAiActivityRouteIntentAssetContract": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_ROUTE_INTENT_ASSET_CONTRACT',
  '"tianxiaYutuAiActivityRouteArrowAssetPath": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_ROUTE_ARROW_ASSET_PATH',
  '"tianxiaYutuAiActivityRouteIntentAssetLoaded": _last_tianxia_yutu_ai_activity_route_intent_asset_loaded',
  '"tianxiaYutuAiActivityRouteIntentSourceTargetCount": _last_tianxia_yutu_ai_activity_route_intent_source_target_count',
  '"tianxiaYutuAiActivityRouteIntentLineDrawCount": _last_tianxia_yutu_ai_activity_route_intent_line_draw_count',
  '"tianxiaYutuAiActivityRouteIntentArrowAssetDrawCount": _last_tianxia_yutu_ai_activity_route_intent_arrow_asset_draw_count',
]) {
  assert.ok(summarySource.includes(requiredSummaryField), `map summary is missing ${requiredSummaryField}`);
}

for (const requiredProductCopy of [
  'compact_summary["tianxiaYutuAiActivityRouteIntentAssetContract"]',
  'compact_summary["tianxiaYutuAiActivityRouteArrowAssetPath"]',
  'compact_summary["tianxiaYutuAiActivityRouteIntentAssetLoaded"]',
  'compact_summary["tianxiaYutuAiActivityRouteIntentSourceTargetCount"]',
  'compact_summary["tianxiaYutuAiActivityRouteIntentLineDrawCount"]',
  'compact_summary["tianxiaYutuAiActivityRouteIntentArrowAssetDrawCount"]',
]) {
  assert.ok(
    productAcceptanceActionSource.includes(requiredProductCopy),
    `product acceptance action must carry ${requiredProductCopy}`,
  );
}

for (const requiredHelperNeedle of [
  'result["productAcceptanceAiActivityRouteIntentAssetContract"]',
  'result["productAcceptanceAiActivityRouteArrowAssetPath"]',
  'result["productAcceptanceAiActivityRouteIntentAssetLoaded"]',
  'result["productAcceptanceAiActivityRouteIntentSourceTargetCount"]',
  'result["productAcceptanceAiActivityRouteIntentLineDrawCount"]',
  'result["productAcceptanceAiActivityRouteIntentArrowAssetDrawCount"]',
  'TianxiaYutuLivingWorldHotspotPolicyScript.route_intent_asset_summary_ok(compact_summary)',
]) {
  assert.ok(
    productAcceptanceSource.includes(requiredHelperNeedle),
    `product acceptance helper is missing ${requiredHelperNeedle}`,
  );
}

for (const closureNeedle of [
  'TIANXIA_YUTU_AI_ROUTE_INTENT_ASSET_TOKEN = "tianxia_yutu_ai_route_intent_asset_v1"',
  'productAcceptanceAiActivityRouteIntentAssetContract!=tianxia_yutu_ai_route_intent_asset_v1',
  'productAcceptanceAiActivityRouteIntentAssetLoaded!=true',
  'productAcceptanceAiActivityRouteIntentSourceTargetCount<=0',
  'productAcceptanceAiActivityRouteIntentLineDrawCount<=0',
  'productAcceptanceAiActivityRouteIntentArrowAssetDrawCount<=0',
]) {
  assert.ok(closureBatchSource.includes(closureNeedle), `closure batch is missing ${closureNeedle}`);
}

console.log('[godot_tianxia_yutu_ai_route_intent_asset_contract] all checks passed');
