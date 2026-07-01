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

const assetRelativePath =
  'godot-client/assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_beacon_v1.png';
const assetImportRelativePath = `${assetRelativePath}.import`;
const manifestRelativePath =
  'godot-client/assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_manifest_v1.json';
const assetResPath =
  'res://assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_beacon_v1.png';
const manifestResPath =
  'res://assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_manifest_v1.json';
const visualAssetContract = 'tianxia_yutu_ai_hotspot_visual_asset_v1';

assert.ok(fs.existsSync(path.join(repoRoot, assetRelativePath)), 'Tianxia AI hotspot beacon PNG must exist.');
assert.ok(
  fs.existsSync(path.join(repoRoot, assetImportRelativePath)),
  'Tianxia AI hotspot beacon PNG must have adjacent Godot import metadata.',
);
assert.ok(fs.existsSync(path.join(repoRoot, manifestRelativePath)), 'Tianxia AI hotspot manifest must exist.');

const manifest = JSON.parse(readSource(manifestRelativePath));
assert.equal(manifest.contractId, visualAssetContract);
assert.equal(manifest.assets?.hotspotBeacon?.path, assetResPath);
assert.equal(manifest.assets?.hotspotBeacon?.role, 'ai_activity_hotspot_beacon');
assert.equal(manifest.assets?.hotspotBeacon?.sizePx?.[0], 64);
assert.equal(manifest.assets?.hotspotBeacon?.sizePx?.[1], 64);

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
  `const HOTSPOT_VISUAL_ASSET_CONTRACT: String = "${visualAssetContract}"`,
  `const HOTSPOT_VISUAL_ASSET_PATH: String = "${assetResPath}"`,
  `const HOTSPOT_VISUAL_ASSET_MANIFEST_PATH: String = "${manifestResPath}"`,
  'static func visual_asset_summary_ok(summary: Dictionary) -> bool:',
  '"tianxiaYutuAiActivityHotspotVisualAssetContract": HOTSPOT_VISUAL_ASSET_CONTRACT',
  '"tianxiaYutuAiActivityHotspotVisualAssetPath": HOTSPOT_VISUAL_ASSET_PATH',
  '"tianxiaYutuAiActivityHotspotVisualAssetLoaded": visual_asset_loaded',
  '"tianxiaYutuAiActivityHotspotVisualAssetDrawCount": visual_asset_draw_count',
]) {
  assert.ok(
    hotspotPolicySource.includes(requiredPolicyNeedle),
    `hotspot policy is missing ${requiredPolicyNeedle}`,
  );
}

for (const requiredMapNeedle of [
  'var _tianxia_yutu_ai_activity_hotspot_texture: Texture2D = null',
  'var _last_tianxia_yutu_ai_activity_hotspot_visual_asset_loaded: bool = false',
  'var _last_tianxia_yutu_ai_activity_hotspot_visual_asset_draw_count: int = 0',
  'func _load_tianxia_yutu_ai_activity_hotspot_texture() -> void:',
  'func _draw_tianxia_yutu_ai_activity_hotspot_asset(point: Vector2, radius: float) -> bool:',
  '_draw_tianxia_yutu_ai_activity_hotspot_asset(point, radius)',
  'draw_texture_rect(_tianxia_yutu_ai_activity_hotspot_texture',
]) {
  assert.ok(mapGridSource.includes(requiredMapNeedle), `map grid is missing ${requiredMapNeedle}`);
}

assert.ok(
  drawHotspotsSource.includes('_last_tianxia_yutu_ai_activity_hotspot_visual_asset_draw_count += 1'),
  'Tianxia hotspot drawing must count real visual asset draws.',
);

for (const requiredSummaryField of [
  '"tianxiaYutuAiActivityHotspotVisualAssetContract": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_VISUAL_ASSET_CONTRACT',
  '"tianxiaYutuAiActivityHotspotVisualAssetPath": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_VISUAL_ASSET_PATH',
  '"tianxiaYutuAiActivityHotspotVisualAssetManifestPath": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_VISUAL_ASSET_MANIFEST_PATH',
  '"tianxiaYutuAiActivityHotspotVisualAssetLoaded": _last_tianxia_yutu_ai_activity_hotspot_visual_asset_loaded',
  '"tianxiaYutuAiActivityHotspotVisualAssetDrawCount": _last_tianxia_yutu_ai_activity_hotspot_visual_asset_draw_count',
]) {
  assert.ok(summarySource.includes(requiredSummaryField), `map summary is missing ${requiredSummaryField}`);
}

for (const requiredProductCopy of [
  'compact_summary["tianxiaYutuAiActivityHotspotVisualAssetContract"]',
  'compact_summary["tianxiaYutuAiActivityHotspotVisualAssetPath"]',
  'compact_summary["tianxiaYutuAiActivityHotspotVisualAssetLoaded"]',
  'compact_summary["tianxiaYutuAiActivityHotspotVisualAssetDrawCount"]',
]) {
  assert.ok(
    productAcceptanceActionSource.includes(requiredProductCopy),
    `product acceptance action must carry ${requiredProductCopy}`,
  );
}

for (const requiredHelperNeedle of [
  'result["productAcceptanceAiActivityHotspotVisualAssetContract"]',
  'result["productAcceptanceAiActivityHotspotVisualAssetPath"]',
  'result["productAcceptanceAiActivityHotspotVisualAssetLoaded"]',
  'result["productAcceptanceAiActivityHotspotVisualAssetDrawCount"]',
  'TianxiaYutuLivingWorldHotspotPolicyScript.visual_asset_summary_ok(compact_summary)',
]) {
  assert.ok(
    productAcceptanceSource.includes(requiredHelperNeedle),
    `product acceptance helper is missing ${requiredHelperNeedle}`,
  );
}

for (const closureNeedle of [
  'TIANXIA_YUTU_AI_HOTSPOT_VISUAL_ASSET_TOKEN = "tianxia_yutu_ai_hotspot_visual_asset_v1"',
  'productAcceptanceAiActivityHotspotVisualAssetContract!=tianxia_yutu_ai_hotspot_visual_asset_v1',
  'productAcceptanceAiActivityHotspotVisualAssetLoaded!=true',
  'productAcceptanceAiActivityHotspotVisualAssetDrawCount<=0',
]) {
  assert.ok(closureBatchSource.includes(closureNeedle), `closure batch is missing ${closureNeedle}`);
}

console.log('[godot_tianxia_yutu_ai_hotspot_visual_asset_contract] all checks passed');
