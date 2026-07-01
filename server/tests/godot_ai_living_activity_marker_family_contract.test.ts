import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const readJson = (relativePath: string): any =>
  JSON.parse(readSource(relativePath));

const functionSource = (source: string, signature: string): string => {
  const start = source.indexOf(signature);
  if (start < 0) {
    return '';
  }
  const next = source.indexOf('\nfunc ', start + signature.length);
  return source.slice(start, next > start ? next : source.length);
};

const readPngSize = (relativePath: string): [number, number] => {
  const buffer = fs.readFileSync(path.join(repoRoot, relativePath));
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG', `${relativePath} must be a PNG asset`);
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
};

const markerFamilyContract = 'ai_living_activity_marker_family_v1';
const manifestRelativePath =
  'godot-client/assets/themes/slgclient/current/ui/map_markers/ai_living_activity_marker_family_manifest_v1.json';
const mainWorldFrameAsset =
  'godot-client/assets/themes/slgclient/current/ui/map_markers/ai_living_activity_main_world_marker_frame_v1.png';
const mainWorldRouteAsset =
  'godot-client/assets/themes/slgclient/current/ui/map_markers/ai_living_activity_main_world_route_arrow_v1.png';
const mainWorldClusterAsset =
  'godot-client/assets/themes/slgclient/current/ui/map_markers/ai_living_activity_main_world_cluster_badge_v1.png';

assert.ok(fs.existsSync(path.join(repoRoot, manifestRelativePath)), 'shared AI living activity marker family manifest must exist.');
const manifest = readJson(manifestRelativePath);
assert.equal(manifest.contractId, markerFamilyContract);
assert.equal(manifest.styleDirection, 'ai_player_living_world_tactical_beacon_family');
assert.equal(manifest.assets?.mainWorldFrame?.path, `res://assets/themes/slgclient/current/ui/map_markers/${path.basename(mainWorldFrameAsset)}`);
assert.equal(manifest.assets?.mainWorldFrame?.role, 'ai_activity_main_world_marker_frame');
assert.equal(manifest.assets?.mainWorldRouteArrow?.path, `res://assets/themes/slgclient/current/ui/map_markers/${path.basename(mainWorldRouteAsset)}`);
assert.equal(manifest.assets?.mainWorldClusterBadge?.path, `res://assets/themes/slgclient/current/ui/map_markers/${path.basename(mainWorldClusterAsset)}`);
assert.equal(manifest.assets?.tianxiaHotspotBeacon?.path, 'res://assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_beacon_v1.png');
assert.equal(manifest.assets?.tianxiaHotspotLabelPlate?.path, 'res://assets/themes/slgclient/current/ui/map_markers/tianxia_yutu_ai_hotspot_label_plate_v1.png');

assert.deepEqual(readPngSize(mainWorldFrameAsset), [96, 96]);
assert.deepEqual(readPngSize(mainWorldRouteAsset), [72, 24]);
assert.deepEqual(readPngSize(mainWorldClusterAsset), [42, 30]);

const aiMapIntentMarkerSource = readSource('godot-client/scripts/map/ai_map_intent_marker.gd');
const unitViewLayerSource = readSource('godot-client/scripts/map/unit_view_layer.gd');
const tianxiaPolicySource = readSource('godot-client/scripts/map/tianxia_yutu_living_world_hotspot_policy.gd');
const mapGridSource = readSource('godot-client/scripts/map/map_grid.gd');
const mainSource = readSource('godot-client/scripts/app/main.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

assert.ok(
  aiMapIntentMarkerSource.includes('const AI_LIVING_ACTIVITY_MARKER_FAMILY_CONTRACT := "ai_living_activity_marker_family_v1"') &&
    aiMapIntentMarkerSource.includes('AI_LIVING_ACTIVITY_MARKER_FAMILY_MANIFEST_PATH') &&
    aiMapIntentMarkerSource.includes('AI_LIVING_ACTIVITY_MAIN_WORLD_MARKER_FRAME_ASSET_PATH') &&
    aiMapIntentMarkerSource.includes('AI_LIVING_ACTIVITY_MAIN_WORLD_ROUTE_ARROW_ASSET_PATH') &&
    aiMapIntentMarkerSource.includes('AI_LIVING_ACTIVITY_MAIN_WORLD_CLUSTER_BADGE_ASSET_PATH') &&
    aiMapIntentMarkerSource.includes('func _load_living_activity_marker_family_textures() -> void:') &&
    aiMapIntentMarkerSource.includes('_draw_living_activity_marker_frame_asset()') &&
    aiMapIntentMarkerSource.includes('_draw_living_activity_route_arrow_asset(') &&
    aiMapIntentMarkerSource.includes('_draw_living_activity_cluster_badge_asset('),
  'main-world AI activity marker must load and draw the shared marker family assets.',
);

assert.ok(
  functionSource(aiMapIntentMarkerSource, 'func get_visual_debug_state() -> Dictionary:').includes('"markerFamilyContract": AI_LIVING_ACTIVITY_MARKER_FAMILY_CONTRACT') &&
    functionSource(aiMapIntentMarkerSource, 'func get_visual_debug_state() -> Dictionary:').includes('"markerFrameAssetLoaded": _marker_frame_texture != null') &&
    functionSource(aiMapIntentMarkerSource, 'func get_visual_debug_state() -> Dictionary:').includes('"markerFrameAssetDrawn": _marker_frame_asset_drawn') &&
    functionSource(aiMapIntentMarkerSource, 'func get_visual_debug_state() -> Dictionary:').includes('"routeArrowAssetDrawn": _route_arrow_asset_drawn') &&
    functionSource(aiMapIntentMarkerSource, 'func get_visual_debug_state() -> Dictionary:').includes('"clusterBadgeAssetDrawn": _cluster_badge_asset_drawn'),
  'main-world marker debug state must expose shared family asset proof.',
);

assert.ok(
  unitViewLayerSource.includes('"aiLivingActivityMarkerFamilyContract":') &&
    unitViewLayerSource.includes('ai_living_activity_marker_family_contracts') &&
    unitViewLayerSource.includes('"aiLivingActivityMarkerFrameAssetDrawCount"') &&
    unitViewLayerSource.includes('"aiLivingActivityMarkerRouteArrowAssetDrawCount"') &&
    unitViewLayerSource.includes('"aiLivingActivityMarkerClusterBadgeAssetDrawCount"'),
  'UnitViewLayer summary must aggregate shared marker family proof.',
);

assert.ok(
  tianxiaPolicySource.includes('const AI_LIVING_ACTIVITY_MARKER_FAMILY_CONTRACT: String = "ai_living_activity_marker_family_v1"') &&
    tianxiaPolicySource.includes('"tianxiaYutuAiActivityMarkerFamilyContract": AI_LIVING_ACTIVITY_MARKER_FAMILY_CONTRACT') &&
    tianxiaPolicySource.includes('str(summary.get("tianxiaYutuAiActivityMarkerFamilyContract", "")).strip_edges() == AI_LIVING_ACTIVITY_MARKER_FAMILY_CONTRACT'),
  'Tianxia hotspot policy must expose the same AI living activity marker family token.',
);

assert.ok(
  mapGridSource.includes('"tianxiaYutuAiActivityMarkerFamilyContract": TianxiaYutuLivingWorldHotspotPolicyScript.AI_LIVING_ACTIVITY_MARKER_FAMILY_CONTRACT'),
  'MapGrid streaming summary must carry the Tianxia marker family token.',
);

assert.ok(
  mainSource.includes('"aiLivingActivityMarkerFamilyContract": str(map_unit_summary.get("aiLivingActivityMarkerFamilyContract", ""))') &&
    mainSource.includes('compact_summary["tianxiaYutuAiActivityMarkerFamilyContract"]') &&
    mainSource.includes('"aiActivityMarkerFamilyContract": "ai_living_activity_marker_family_v1"') &&
    mainSource.includes('"aiActivityMarkerFamilyCrossSurfaceOk": marker_family_cross_surface_ok') &&
    mainSource.includes('"aiActivityMarkerFamilyMainWorldFrameAssetDrawCount": main_world_marker_frame_asset_draw_count') &&
    mainSource.includes('"aiActivityMarkerFamilyTianxiaHotspotAssetDrawCount": tianxia_hotspot_asset_draw_count'),
  'formal actions must expose main-world and Tianxia shared marker family proof.',
);

assert.ok(
  visualSmokeSource.includes('"aiLivingActivityMarkerFamilyContract"') &&
    visualSmokeSource.includes('"aiLivingActivityMarkerFrameAssetDrawCount"') &&
    visualSmokeSource.includes('"aiActivityMarkerFamilyContract"') &&
    visualSmokeSource.includes('"aiActivityMarkerFamilyCrossSurfaceOk"'),
  'visual smoke required fields must include shared marker family proof.',
);

assert.ok(
  closureBatchSource.includes('AI_LIVING_ACTIVITY_MARKER_FAMILY_TOKEN = "ai_living_activity_marker_family_v1"') &&
    closureBatchSource.includes('aiLivingActivityMarkerFamilyContract!=ai_living_activity_marker_family_v1') &&
    closureBatchSource.includes('productAcceptanceAiActivityMarkerFamilyContract!=ai_living_activity_marker_family_v1') &&
    closureBatchSource.includes('aiLivingActivityMarkerFrameAssetDrawCount<=0') &&
    closureBatchSource.includes('aiActivityMarkerFamilyCrossSurfaceOk!=true') &&
    closureBatchSource.includes('aiActivityMarkerFamilyMainWorldFrameAssetDrawCount<=0') &&
    closureBatchSource.includes('aiActivityMarkerFamilyTianxiaHotspotAssetDrawCount<=0'),
  'closure batch must reject missing shared marker family proof.',
);

assert.ok(
  readSource('godot-client/scripts/app/helpers/tianxia_yutu_product_acceptance_contract.gd').includes(
    'result["productAcceptanceAiActivityMarkerFamilyContract"]',
  ),
  'Tianxia product acceptance result must expose the shared marker family token.',
);

console.log('[godot_ai_living_activity_marker_family_contract] all checks passed');
