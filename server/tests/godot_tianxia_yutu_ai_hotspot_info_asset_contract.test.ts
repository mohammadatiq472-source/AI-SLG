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

const labelPlateRelativePath =
  'godot-client/assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_label_plate_v1.png';
const clusterBadgeRelativePath =
  'godot-client/assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_cluster_badge_v1.png';
const labelPlateResPath =
  'res://assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_label_plate_v1.png';
const clusterBadgeResPath =
  'res://assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_cluster_badge_v1.png';
const manifestRelativePath =
  'godot-client/assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_manifest_v1.json';
const infoAssetContract = 'tianxia_yutu_ai_hotspot_info_asset_v1';

for (const assetPath of [labelPlateRelativePath, clusterBadgeRelativePath]) {
  assert.ok(fs.existsSync(path.join(repoRoot, assetPath)), `${assetPath} must exist.`);
  assert.ok(fs.existsSync(path.join(repoRoot, `${assetPath}.import`)), `${assetPath}.import must exist.`);
}

const manifest = JSON.parse(readSource(manifestRelativePath));
assert.equal(manifest.infoContractId, infoAssetContract);
assert.equal(manifest.assets?.labelPlate?.path, labelPlateResPath);
assert.equal(manifest.assets?.labelPlate?.role, 'ai_activity_hotspot_label_plate');
assert.equal(manifest.assets?.labelPlate?.sizePx?.[0], 192);
assert.equal(manifest.assets?.labelPlate?.sizePx?.[1], 42);
assert.equal(manifest.assets?.clusterBadge?.path, clusterBadgeResPath);
assert.equal(manifest.assets?.clusterBadge?.role, 'ai_activity_hotspot_cluster_badge');
assert.equal(manifest.assets?.clusterBadge?.sizePx?.[0], 42);
assert.equal(manifest.assets?.clusterBadge?.sizePx?.[1], 30);

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
  `const HOTSPOT_INFO_ASSET_CONTRACT: String = "${infoAssetContract}"`,
  `const HOTSPOT_LABEL_PLATE_ASSET_PATH: String = "${labelPlateResPath}"`,
  `const HOTSPOT_CLUSTER_BADGE_ASSET_PATH: String = "${clusterBadgeResPath}"`,
  'static func info_asset_summary_ok(summary: Dictionary) -> bool:',
  '"tianxiaYutuAiActivityHotspotInfoAssetContract": HOTSPOT_INFO_ASSET_CONTRACT',
  '"tianxiaYutuAiActivityHotspotLabelPlateAssetPath": HOTSPOT_LABEL_PLATE_ASSET_PATH',
  '"tianxiaYutuAiActivityHotspotClusterBadgeAssetPath": HOTSPOT_CLUSTER_BADGE_ASSET_PATH',
  '"tianxiaYutuAiActivityHotspotInfoAssetLoaded": info_asset_loaded',
  '"tianxiaYutuAiActivityHotspotLabelPlateAssetDrawCount": label_plate_asset_draw_count',
  '"tianxiaYutuAiActivityHotspotClusterBadgeAssetDrawCount": cluster_badge_asset_draw_count',
]) {
  assert.ok(
    hotspotPolicySource.includes(requiredPolicyNeedle),
    `hotspot policy is missing ${requiredPolicyNeedle}`,
  );
}

for (const requiredMapNeedle of [
  'var _tianxia_yutu_ai_activity_hotspot_label_plate_texture: Texture2D = null',
  'var _tianxia_yutu_ai_activity_hotspot_cluster_badge_texture: Texture2D = null',
  'var _last_tianxia_yutu_ai_activity_hotspot_info_asset_loaded: bool = false',
  'var _last_tianxia_yutu_ai_activity_hotspot_label_plate_asset_draw_count: int = 0',
  'var _last_tianxia_yutu_ai_activity_hotspot_cluster_badge_asset_draw_count: int = 0',
  'func _load_tianxia_yutu_ai_activity_hotspot_info_textures() -> void:',
  'func _draw_tianxia_yutu_ai_activity_hotspot_label_plate_asset(label_pos: Vector2, label: String) -> bool:',
  'func _draw_tianxia_yutu_ai_activity_hotspot_cluster_badge_asset(cluster_pos: Vector2, cluster_count: int) -> bool:',
  '_draw_tianxia_yutu_ai_activity_hotspot_label_plate_asset(label_pos, label)',
  '_draw_tianxia_yutu_ai_activity_hotspot_cluster_badge_asset(cluster_pos, cluster_count)',
]) {
  assert.ok(mapGridSource.includes(requiredMapNeedle), `map grid is missing ${requiredMapNeedle}`);
}

assert.ok(
  drawHotspotsSource.includes('_last_tianxia_yutu_ai_activity_hotspot_label_plate_asset_draw_count += 1') &&
    drawHotspotsSource.includes('_last_tianxia_yutu_ai_activity_hotspot_cluster_badge_asset_draw_count += 1'),
  'Tianxia hotspot drawing must count label plate and cluster badge asset draws.',
);

for (const requiredSummaryField of [
  '"tianxiaYutuAiActivityHotspotInfoAssetContract": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_INFO_ASSET_CONTRACT',
  '"tianxiaYutuAiActivityHotspotLabelPlateAssetPath": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_LABEL_PLATE_ASSET_PATH',
  '"tianxiaYutuAiActivityHotspotClusterBadgeAssetPath": TianxiaYutuLivingWorldHotspotPolicyScript.HOTSPOT_CLUSTER_BADGE_ASSET_PATH',
  '"tianxiaYutuAiActivityHotspotInfoAssetLoaded": _last_tianxia_yutu_ai_activity_hotspot_info_asset_loaded',
  '"tianxiaYutuAiActivityHotspotLabelPlateAssetDrawCount": _last_tianxia_yutu_ai_activity_hotspot_label_plate_asset_draw_count',
  '"tianxiaYutuAiActivityHotspotClusterBadgeAssetDrawCount": _last_tianxia_yutu_ai_activity_hotspot_cluster_badge_asset_draw_count',
]) {
  assert.ok(summarySource.includes(requiredSummaryField), `map summary is missing ${requiredSummaryField}`);
}

for (const requiredProductCopy of [
  'compact_summary["tianxiaYutuAiActivityHotspotInfoAssetContract"]',
  'compact_summary["tianxiaYutuAiActivityHotspotLabelPlateAssetPath"]',
  'compact_summary["tianxiaYutuAiActivityHotspotClusterBadgeAssetPath"]',
  'compact_summary["tianxiaYutuAiActivityHotspotInfoAssetLoaded"]',
  'compact_summary["tianxiaYutuAiActivityHotspotLabelPlateAssetDrawCount"]',
  'compact_summary["tianxiaYutuAiActivityHotspotClusterBadgeAssetDrawCount"]',
]) {
  assert.ok(
    productAcceptanceActionSource.includes(requiredProductCopy),
    `product acceptance action must carry ${requiredProductCopy}`,
  );
}

for (const requiredHelperNeedle of [
  'result["productAcceptanceAiActivityHotspotInfoAssetContract"]',
  'result["productAcceptanceAiActivityHotspotLabelPlateAssetPath"]',
  'result["productAcceptanceAiActivityHotspotClusterBadgeAssetPath"]',
  'result["productAcceptanceAiActivityHotspotInfoAssetLoaded"]',
  'result["productAcceptanceAiActivityHotspotLabelPlateAssetDrawCount"]',
  'result["productAcceptanceAiActivityHotspotClusterBadgeAssetDrawCount"]',
  'TianxiaYutuLivingWorldHotspotPolicyScript.info_asset_summary_ok(compact_summary)',
]) {
  assert.ok(
    productAcceptanceSource.includes(requiredHelperNeedle),
    `product acceptance helper is missing ${requiredHelperNeedle}`,
  );
}

for (const closureNeedle of [
  'TIANXIA_YUTU_AI_HOTSPOT_INFO_ASSET_TOKEN = "tianxia_yutu_ai_hotspot_info_asset_v1"',
  'productAcceptanceAiActivityHotspotInfoAssetContract!=tianxia_yutu_ai_hotspot_info_asset_v1',
  'productAcceptanceAiActivityHotspotInfoAssetLoaded!=true',
  'productAcceptanceAiActivityHotspotLabelPlateAssetDrawCount<=0',
  'productAcceptanceAiActivityHotspotClusterBadgeAssetDrawCount<=0',
]) {
  assert.ok(closureBatchSource.includes(closureNeedle), `closure batch is missing ${closureNeedle}`);
}

console.log('[godot_tianxia_yutu_ai_hotspot_info_asset_contract] all checks passed');
