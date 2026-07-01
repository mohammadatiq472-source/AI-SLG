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

const routeHeadingContract = 'tianxia_yutu_ai_route_heading_v1';

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
const drawRouteArrowSource = functionSource(
  mapGridSource,
  'func _draw_tianxia_yutu_ai_activity_route_arrow_asset(arrow_pos: Vector2, route_heading: float, state_variant: String) -> bool:',
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
  `const HOTSPOT_ROUTE_HEADING_CONTRACT: String = "${routeHeadingContract}"`,
  'static func route_heading_summary_ok(summary: Dictionary) -> bool:',
  '"tianxiaYutuAiActivityRouteHeadingContract": HOTSPOT_ROUTE_HEADING_CONTRACT',
  '"tianxiaYutuAiActivityRouteHeadingAppliedCount": route_heading_applied_count',
  '"tianxiaYutuAiActivityRouteFirstHeadingRadians": first_heading_radians',
]) {
  assert.ok(
    hotspotPolicySource.includes(requiredPolicyNeedle),
    `hotspot policy is missing ${requiredPolicyNeedle}`,
  );
}

for (const requiredMapNeedle of [
  'var _last_tianxia_yutu_ai_activity_route_heading_applied_count: int = 0',
  'var _last_tianxia_yutu_ai_activity_route_first_heading_radians: float = 0.0',
  'var route_heading := (point - source_point).angle()',
  '_draw_tianxia_yutu_ai_activity_route_arrow_asset(arrow_pos, route_heading, state_variant)',
  'func _draw_tianxia_yutu_ai_activity_route_arrow_asset(arrow_pos: Vector2, route_heading: float, state_variant: String) -> bool:',
]) {
  assert.ok(mapGridSource.includes(requiredMapNeedle), `map grid is missing ${requiredMapNeedle}`);
}

assert.ok(
  drawHotspotsSource.includes('_last_tianxia_yutu_ai_activity_route_heading_applied_count += 1') &&
    drawHotspotsSource.includes('_last_tianxia_yutu_ai_activity_route_first_heading_radians = route_heading'),
  'Tianxia route intent drawing must count heading application and record first heading.',
);

assert.ok(
  drawRouteArrowSource.includes('draw_set_transform(arrow_pos, route_heading, Vector2.ONE)') &&
    drawRouteArrowSource.includes('draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)') &&
    drawRouteArrowSource.includes('Rect2(-draw_size * 0.5, draw_size)'),
  'Route arrow asset must be drawn with a local rotated transform and then reset.',
);

for (const requiredSummaryField of [
  '"tianxiaYutuAiActivityRouteHeadingContract": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_ROUTE_HEADING_CONTRACT',
  '"tianxiaYutuAiActivityRouteHeadingAppliedCount": _last_tianxia_yutu_ai_activity_route_heading_applied_count',
  '"tianxiaYutuAiActivityRouteFirstHeadingRadians": _last_tianxia_yutu_ai_activity_route_first_heading_radians',
]) {
  assert.ok(summarySource.includes(requiredSummaryField), `map summary is missing ${requiredSummaryField}`);
}

for (const requiredProductCopy of [
  'compact_summary["tianxiaYutuAiActivityRouteHeadingContract"]',
  'compact_summary["tianxiaYutuAiActivityRouteHeadingAppliedCount"]',
  'compact_summary["tianxiaYutuAiActivityRouteFirstHeadingRadians"]',
]) {
  assert.ok(
    productAcceptanceActionSource.includes(requiredProductCopy),
    `product acceptance action must carry ${requiredProductCopy}`,
  );
}

for (const requiredHelperNeedle of [
  'result["productAcceptanceAiActivityRouteHeadingContract"]',
  'result["productAcceptanceAiActivityRouteHeadingAppliedCount"]',
  'result["productAcceptanceAiActivityRouteFirstHeadingRadians"]',
  'TianxiaYutuLivingWorldHotspotPolicyScript.route_heading_summary_ok(compact_summary)',
]) {
  assert.ok(
    productAcceptanceSource.includes(requiredHelperNeedle),
    `product acceptance helper is missing ${requiredHelperNeedle}`,
  );
}

for (const closureNeedle of [
  'TIANXIA_YUTU_AI_ROUTE_HEADING_TOKEN = "tianxia_yutu_ai_route_heading_v1"',
  'productAcceptanceAiActivityRouteHeadingContract!=tianxia_yutu_ai_route_heading_v1',
  'productAcceptanceAiActivityRouteHeadingAppliedCount<=0',
]) {
  assert.ok(closureBatchSource.includes(closureNeedle), `closure batch is missing ${closureNeedle}`);
}

console.log('[godot_tianxia_yutu_ai_route_heading_contract] all checks passed');
