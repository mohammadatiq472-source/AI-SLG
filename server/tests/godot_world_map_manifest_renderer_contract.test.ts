import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const mapGridPath = path.join(repoRoot, 'godot-client/scripts/map/map_grid.gd');
const validationDocPath = path.join(repoRoot, 'docs/parallel-validation/2026-06-19-asset-style-validation.md');
const screenshotMatrixDocPath = path.join(repoRoot, 'docs/parallel-validation/2026-06-19-asset-style-screenshot-matrix.md');
const labelManifestPath = path.join(repoRoot, 'godot-client/assets/themes/slgclient/manifests/world_label_chrome_manifest_v1.json');
const manifestPaths = [
  path.join(repoRoot, 'godot-client/assets/themes/slgclient/manifests/world_region_overlay_manifest_v1.json'),
  path.join(repoRoot, 'godot-client/assets/themes/slgclient/manifests/world_route_assets_manifest_v1.json'),
  path.join(repoRoot, 'godot-client/assets/themes/slgclient/manifests/world_event_marker_manifest_v1.json'),
  path.join(repoRoot, 'godot-client/assets/themes/slgclient/manifests/world_label_chrome_manifest_v1.json'),
];

function readSource(filePath: string): string {
  assert.ok(fs.existsSync(filePath), `missing file: ${filePath}`);
  return fs.readFileSync(filePath, 'utf8');
}

function functionSource(source: string, signature: string): string {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `missing signature: ${signature}`);
  const nextFunc = source.indexOf('\nfunc ', start + signature.length);
  return nextFunc === -1 ? source.slice(start) : source.slice(start, nextFunc);
}

for (const manifestPath of manifestPaths) {
  const manifest = JSON.parse(readSource(manifestPath));
  assert.equal(manifest.authority.status, 'asset_ready_and_renderer_wired', `${path.basename(manifestPath)} authority status drifted`);
  if (path.basename(manifestPath) === 'world_label_chrome_manifest_v1.json') {
    const copyLint = manifest.copyLint;
    assert.ok(copyLint, 'label manifest requires copyLint');
    assert.ok(Array.isArray(copyLint.forbiddenVisibleTerms), 'label manifest copyLint should include forbiddenVisibleTerms array');
    for (const expected of ['read model', 'AI Activity', 'asset_ready', 'renderer_wired', 'authority', 'tier', 'contract', 'snake_case', 'schema', 'layer', 'world_cell', 'tianxia_yutu_overview']) {
      assert.ok((copyLint.forbiddenVisibleTerms as string[]).includes(expected), `missing forbiddenVisibleTerms item: ${expected}`);
    }
  }
}

const labelManifest = JSON.parse(readSource(labelManifestPath));
const labelCopyLint = labelManifest.copyLint;
assert.ok(labelCopyLint, 'label manifest should include copyLint');
assert.ok(Array.isArray(labelCopyLint.forbiddenVisibleTerms), 'label manifest copyLint should include forbiddenVisibleTerms array');
for (const expected of ['read model', 'AI Activity', 'asset_ready', 'renderer_wired', 'authority', 'tier', 'contract', 'snake_case', 'schema', 'layer', 'world_cell', 'tianxia_yutu_overview']) {
  assert.ok((labelCopyLint.forbiddenVisibleTerms as string[]).includes(expected), `missing forbiddenVisibleTerms item: ${expected}`);
}

const mapGridSource = readSource(mapGridPath);
const readySource = functionSource(mapGridSource, 'func _ready() -> void:');
const summarySource = functionSource(mapGridSource, 'func get_main_map_streaming_debug_summary() -> Dictionary:');

for (const expected of [
  'const THEME_WORLD_REGION_OVERLAY_MANIFEST_PATH: String = "res://assets/themes/slgclient/manifests/world_region_overlay_manifest_v1.json"',
  'const THEME_WORLD_ROUTE_ASSETS_MANIFEST_PATH: String = "res://assets/themes/slgclient/manifests/world_route_assets_manifest_v1.json"',
  'const THEME_WORLD_EVENT_MARKER_MANIFEST_PATH: String = "res://assets/themes/slgclient/manifests/world_event_marker_manifest_v1.json"',
  'const THEME_WORLD_LABEL_CHROME_MANIFEST_PATH: String = "res://assets/themes/slgclient/manifests/world_label_chrome_manifest_v1.json"',
  'const WORLD_MAP_MANIFEST_RENDERER_WIRING_STATUS: String = "asset_ready_and_renderer_wired"',
  'var _world_region_overlay_manifest: Dictionary = {}',
  'var _world_route_assets_manifest: Dictionary = {}',
  'var _world_event_marker_manifest: Dictionary = {}',
  'var _world_label_chrome_manifest: Dictionary = {}',
  'var _world_map_manifest_fallback_reason_by_manifest: Dictionary = {}',
  'func _load_world_map_theme_manifest(path: String, expected_manifest_id: String, fallback_warning_label: String) -> Dictionary:',
  'func _load_world_region_overlay_manifest() -> void:',
  'func _load_world_route_assets_manifest() -> void:',
  'func _load_world_event_marker_manifest() -> void:',
  'func _load_world_label_chrome_manifest() -> void:',
  'func _world_map_manifest_visible_layer_tokens_for(manifest_key: String) -> Array:',
  'func _world_map_region_palette_entry(entry_key: String) -> Dictionary:',
  'func _world_map_route_family_entry(family_key: String) -> Dictionary:',
  'func _world_map_label_family_entry(family_key: String) -> Dictionary:',
  'func _world_map_event_selection_entry(state_key: String) -> Dictionary:',
  'func _world_map_screenshot_acceptance_metric_fields() -> Array:',
  'func _world_map_screenshot_acceptance_contract() -> Dictionary:',
  'func _draw_world_map_label_plate(font: Font, baseline_pos: Vector2, label: String, font_size: int, family_key: String) -> void:',
]) {
  assert.ok(mapGridSource.includes(expected), `map_grid.gd missing expected wiring fragment: ${expected}`);
}

for (const expected of [
  '_load_world_region_overlay_manifest()',
  '_load_world_route_assets_manifest()',
  '_load_world_event_marker_manifest()',
  '_load_world_label_chrome_manifest()',
]) {
  assert.ok(readySource.includes(expected), `_ready() missing manifest loader call: ${expected}`);
}

for (const expected of [
  'push_warning("[map-grid-theme] %s missing: %s" % [fallback_warning_label, path])',
  'push_warning("[map-grid-theme] %s open failed: %s" % [fallback_warning_label, path])',
  'push_warning("[map-grid-theme] %s parse failed: %s" % [fallback_warning_label, path])',
  '_world_map_manifest_renderer_wiring_status = WORLD_MAP_MANIFEST_FALLBACK_STATUS',
]) {
  assert.ok(mapGridSource.includes(expected), `map_grid.gd missing manifest fallback guard: ${expected}`);
}

for (const expected of [
  '"worldMapManifestRendererWiringStatus": _world_map_manifest_renderer_wiring_status',
  '"worldMapAssetReadyAndRendererWired": _world_map_manifest_renderer_wiring_status == WORLD_MAP_MANIFEST_RENDERER_WIRING_STATUS',
  '"worldMapRegionOverlayManifestLoaded": _world_map_manifest_loaded(_world_region_overlay_manifest)',
  '"worldMapRegionOverlayVisibleLayerTokens": _world_map_manifest_visible_layer_tokens_for("region_overlay")',
  '"worldMapRouteManifestLoaded": _world_map_manifest_loaded(_world_route_assets_manifest)',
  '"worldMapRouteVisibleLayerTokens": _world_map_manifest_visible_layer_tokens_for("route_overlay")',
  '"worldMapEventMarkerManifestLoaded": _world_map_manifest_loaded(_world_event_marker_manifest)',
  '"worldMapEventMarkerVisibleLayerTokens": _world_map_manifest_visible_layer_tokens_for("event_marker_overlay")',
  '"worldMapLabelChromeManifestLoaded": _world_map_manifest_loaded(_world_label_chrome_manifest)',
  '"worldMapLabelChromeVisibleLayerTokens": _world_map_manifest_visible_layer_tokens_for("label_chrome_overlay")',
  '"worldMapScreenshotAcceptanceStatus": "visual_quality_pending"',
  '"worldMapScreenshotAcceptanceMetricFields": _world_map_screenshot_acceptance_metric_fields()',
  '"worldMapScreenshotAcceptanceContract": _world_map_screenshot_acceptance_contract()',
  '"worldMapVisibleLayerDrawPathEvidence": _world_map_visible_layer_draw_path_evidence()',
]) {
  assert.ok(summarySource.includes(expected), `debug summary missing renderer wiring field: ${expected}`);
}

for (const expected of [
  'func _world_map_visible_layer_draw_path_evidence() -> Dictionary:',
  '"status": "renderer_visible_visual_quality_pending"',
  '"requiresGodotScreenshot": true',
  '"acceptanceRow": "A02"',
  '"acceptanceRow": "A03"',
  '"acceptanceRow": "A04"',
  '"acceptanceRow": "A05"',
  '"visibleTokenField": "worldMapRegionOverlayVisibleLayerTokens"',
  '"visibleTokenField": "worldMapRouteVisibleLayerTokens"',
  '"visibleTokenField": "worldMapLabelChromeVisibleLayerTokens"',
  '"visibleTokenField": "worldMapEventMarkerVisibleLayerTokens"',
  '"drawPath": "_draw_tianxia_yutu_administrative_drilldown_overlays"',
  '"drawPath": "_draw_tianxia_yutu_frontline_markers"',
  '"drawPath": "_draw_world_map_label_plate"',
  '"drawPath": "_draw_tianxia_yutu_living_world_hotspots"',
  'const TIANXIA_YUTU_ROUTE_ENDPOINT_ANCHOR_OUTER_RADIUS: float = 3.8',
  'const TIANXIA_YUTU_ROUTE_TARGET_ANCHOR_RING_RADIUS: float = 5.6',
  'const TIANXIA_YUTU_HOTSPOT_HALO_RING_RADIUS_PAD: float = 7.6',
  'const TIANXIA_YUTU_HOTSPOT_HALO_RING_WIDTH: float = 2.2',
  '"tianxiaYutuRuntimeFactionColorEntryCount"',
  '"tianxiaYutuAiActivityRouteIntentLineDrawCount"',
  '"tianxiaYutuAiActivityRouteIntentEndpointAnchorDrawCount"',
  '"tianxiaYutuAiActivityHotspotHaloDrawCount"',
  '"visibleRelationshipCue": "route_source_and_target_endpoint_anchors"',
  '"visibleRelationshipCue": "hotspot_halo_drawn_above_route_intent"',
  '"drawOrderCue": "route_intent_before_hotspot_halo"',
  '"requiredVisibleCopyExamples"',
  '"我城3"',
  '"他城3"',
  '"rejectIfOnlySummaryProvesVisibility": true',
]) {
  assert.ok(mapGridSource.includes(expected), `visible layer draw-path evidence missing false-green guard: ${expected}`);
}

for (const expected of [
  '_world_map_region_palette_entry("ally")',
  '_world_map_region_palette_entry("friendly")',
  '_world_map_overlay_family_entry("region_border_line")',
  '_world_map_route_family_entry("selected_route")',
  '_world_map_event_selection_entry("selected")',
  '_draw_world_map_label_plate(font, label_pos, label, font_size, label_family_key)',
  'var font_scale: float = maxf(0.75, float(label_family.get("fontScale", 1.0)))',
  'func _draw_world_map_label_plate(font: Font, baseline_pos: Vector2, label: String, font_size: int, family_key: String) -> void:',
  'var scaled_font_size: int = int(round(font_size * font_scale))',
  'var font_scale: float = maxf(0.7, float(family.get("fontScale", 1.0)))',
  'draw_circle(source_point, TIANXIA_YUTU_ROUTE_ENDPOINT_ANCHOR_OUTER_RADIUS',
  'draw_arc(target_point, TIANXIA_YUTU_ROUTE_TARGET_ANCHOR_RING_RADIUS - 1.0',
  '_last_tianxia_yutu_ai_activity_route_intent_endpoint_anchor_draw_count += 2',
  'draw_arc(point, radius + TIANXIA_YUTU_HOTSPOT_HALO_RING_RADIUS_PAD',
  '_last_tianxia_yutu_ai_activity_hotspot_halo_draw_count += 1',
]) {
  assert.ok(mapGridSource.includes(expected), `visible draw path is not consuming manifest authority: ${expected}`);
}

const hasSelectionRadiusFormula =
  mapGridSource.includes('selection_radius = maxf(marker_radius + 10.0, float(selection_entry.get("radiusPx", 26)) * 0.80)') ||
  mapGridSource.includes('selection_radius: float = maxf(marker_radius + 10.0, float(selection_entry.get("radiusPx", 26)) * 0.80)');
assert.ok(hasSelectionRadiusFormula, 'visible draw path should consume event marker selection radius formula from manifest');

for (const expected of [
  'const HUMAN_HOME_LABEL: String = "我"',
  'const AI_HOME_LABEL: String = "他"',
  'var badge_text: String = "%s城%d" % [label, city_level]',
]) {
  assert.ok(mapGridSource.includes(expected), `home city map badge must use short Chinese player-visible copy: ${expected}`);
}

for (const forbidden of [
  'const HUMAN_HOME_LABEL: String = "P"',
  'const AI_HOME_LABEL: String = "AI"',
  'var badge_text: String = "%s C%d" % [label, city_level]',
]) {
  assert.ok(!mapGridSource.includes(forbidden), `home city map badge must not leak English/debug copy: ${forbidden}`);
}

const validationDoc = readSource(validationDocPath);
const screenshotMatrixDoc = readSource(screenshotMatrixDocPath);
assert.ok(validationDoc.includes('asset_ready_and_renderer_wired'), 'validation doc should describe wired status');
assert.ok(validationDoc.includes('Godot screenshot validation'), 'validation doc should keep screenshot follow-up note');
assert.ok(validationDoc.includes('renderer_visible'), 'validation doc should distinguish renderer-visible status');
assert.ok(validationDoc.includes('2026-06-19-asset-style-screenshot-matrix.md'), 'validation doc should link the executable screenshot matrix');
for (const expected of [
  'region_overlay: `renderer_visible`',
  'route / frontline line: `renderer_visible`',
  'city / gate label chrome: `renderer_visible`',
  'focus marker / selection halo: `renderer_visible`',
  'visual_quality_pending',
  '## Player Visible Map Layer Matrix',
  '州 / 势力色块',
  '道路 / 线网',
  '城市 / 关口牌',
  '战略节点 / 热点 / 选中圈',
  '`worldMapRegionOverlayVisibleLayerTokens`',
  '`worldMapRouteVisibleLayerTokens`',
  '`worldMapLabelChromeVisibleLayerTokens`',
  '`worldMapEventMarkerVisibleLayerTokens`',
  '`_draw_tianxia_yutu_administrative_drilldown_overlays(...)`',
  '`_draw_tianxia_yutu_frontline_markers(...)`',
  '`_draw_world_map_label_plate(...)`',
  '`_draw_tianxia_yutu_living_world_hotspots(...)`',
  'Reject if visible `P`, `AI`, `C3`',
  'Reject if marker / halo is hidden by UI',
  'Round 18 token-only false-GREEN boundary',
  'A03 / Road-route network is Priority 1',
  'A05 / Strategic node and event marker is Priority 2',
  'A02 / Region and faction tint is Priority 3',
  'A04 / City and gate label chrome is Priority 4',
  '`worldMapVisibleLayerDrawPathEvidence` is reviewer alignment only',
]) {
  assert.ok(validationDoc.includes(expected), `validation doc should track status: ${expected}`);
}

assert.ok(
  validationDoc.includes('Reject if player-visible surface shows engineering terms'),
  'validation doc should keep engineering terms as screenshot reject criteria',
);
for (const expected of ['AI Activity', 'asset_ready', 'renderer_wired', 'contract', 'read model', 'authority', 'tier']) {
  assert.ok(validationDoc.includes(expected), `validation doc should explicitly reject visible engineering term: ${expected}`);
}

for (const expected of [
  'A01',
  'A02',
  'A03',
  'A04',
  'A05',
  'A06',
  'A07',
  'A08',
  'worldMapScreenshotAcceptanceStatus',
  'worldMapManifestVisibleLayerTokens',
  'worldMapRegionOverlayVisibleLayerTokens',
  'worldMapRouteVisibleLayerTokens',
  'worldMapEventMarkerVisibleLayerTokens',
  'worldMapLabelChromeVisibleLayerTokens',
  'tianxiaYutuRuntimeFactionColorEntryCount',
  'tianxiaYutuAiActivityRouteIntentLineDrawCount',
  'tianxiaYutuAiActivityRouteIntentEndpointAnchorDrawCount',
  'tianxiaYutuAiActivityHotspotHaloDrawCount',
  '我城3',
  '他城3',
  'only as a token or draw count',
  'raw source labels',
  '## A02-A05 Token-only False-Green Arbitration',
  'Screenshot must prove',
  'Locator-only summary fields',
  'Immediate reject if',
  'Priority 1',
  'A03 / Road-route network',
  'worldMapVisibleLayerDrawPathEvidence.routeOverlay',
  'route_source_and_target_endpoint_anchors',
  'Priority 2',
  'A05 / Strategic node and event marker',
  'worldMapVisibleLayerDrawPathEvidence.eventMarkerOverlay',
  'hotspot_halo_drawn_above_route_intent',
  'route_intent_before_hotspot_halo',
  'Priority 3',
  'A02 / Region and faction tint',
  'worldMapVisibleLayerDrawPathEvidence.regionOverlay',
  'Priority 4',
  'A04 / City and gate label chrome',
  'worldMapVisibleLayerDrawPathEvidence.labelChrome',
  'Reviewer alignment only',
  'A02-A05 must not pass from token / draw count alone',
  'mapFirstComposition',
  'uiOcclusion',
  'regionTintReadable',
  'routeNetworkReadable',
  'cityPlateReadable',
  'eventMarkerUiConflict',
  'playerVisibleEngineeringLeakFree',
  'visual_quality_pending=true',
  'Static checks may not prove',
]) {
  assert.ok(screenshotMatrixDoc.includes(expected), `screenshot matrix should cover: ${expected}`);
}

for (const expected of ['AI Activity', 'asset_ready', 'renderer_wired', 'contract', 'read model', 'authority', 'tier']) {
  assert.ok(screenshotMatrixDoc.includes(expected), `screenshot matrix should reject visible engineering term: ${expected}`);
}

for (const expected of [
  'worldMapRegionOverlayVisibleLayerTokens',
  'worldMapRouteVisibleLayerTokens',
  'worldMapEventMarkerVisibleLayerTokens',
  'worldMapLabelChromeVisibleLayerTokens',
  '"state_boundary_overlay"',
  '"route_intent_overlay"',
  '"city_gate_anchors"',
]) {
  assert.ok(mapGridSource.includes(expected), `renderer-visible layer token should be explicitly represented: ${expected}`);
}

const renderVisibleSummaryBlock = mapGridSource
  .split('func get_main_map_streaming_debug_summary() -> Dictionary:')[1];
assert.ok(renderVisibleSummaryBlock.includes('worldMapManifestVisibleLayerTokens'), 'summary should expose manifest visible tokens');
assert.ok(renderVisibleSummaryBlock.includes('\"worldMapManifestRendererWiringStatus\"'), 'summary should expose manifest wiring status');

for (const expected of [
  'mapFirstComposition',
  'uiOcclusion',
  'regionTintReadable',
  'routeNetworkReadable',
  'cityPlateReadable',
  'eventMarkerUiConflict',
  'playerVisibleEngineeringLeakFree',
  'reject_if_ui_cards_are_first_read_or_map_body_is_secondary',
  'reject_if_player_surface_shows_engineering_terms',
]) {
  assert.ok(mapGridSource.includes(expected), `screenshot acceptance contract missing: ${expected}`);
}

console.log('[godot_world_map_manifest_renderer_contract] all checks passed');
