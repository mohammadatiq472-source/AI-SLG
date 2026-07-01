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
    'const AI_LIVING_ACTIVITY_MARKER_VISUAL_ASSET_CONTRACT := "ai_living_activity_marker_visual_asset_v1"',
  ),
  'AIMapIntentMarker must expose the living marker visual-asset contract token.',
);

for (const requiredVar of [
  'var _avatar_image_path: String',
  'var _avatar_texture: Texture2D',
  'var _status_dot: String',
  'var _target_line_visible: bool',
  'var _target_line_vector: Vector2',
]) {
  assert.ok(aiMapIntentMarkerSource.includes(requiredVar), `AIMapIntentMarker is missing ${requiredVar}`);
}

assert.ok(
  aiMapIntentMarkerSource.includes(
    'func set_living_activity_visual_identity(avatar_image_path: String, status_dot: String, target_line_vector: Vector2, target_line_visible: bool) -> void:',
  ) &&
    aiMapIntentMarkerSource.includes('func _draw_living_activity_avatar_pin() -> void:') &&
    aiMapIntentMarkerSource.includes('func _draw_living_activity_status_badge() -> void:') &&
    aiMapIntentMarkerSource.includes('func _draw_living_activity_target_line() -> void:') &&
    aiMapIntentMarkerSource.includes('func get_visual_debug_state() -> Dictionary:'),
  'AIMapIntentMarker must accept and draw avatar pin, status badge, target line, and expose debug summary.',
);

assert.ok(
  drawLivingMarkerSource.includes('_draw_living_activity_target_line()') &&
    drawLivingMarkerSource.includes('_draw_living_activity_avatar_pin()') &&
    drawLivingMarkerSource.includes('_draw_living_activity_status_badge()'),
  'living-activity marker drawing must include target line, avatar pin, and status badge.',
);

assert.ok(
  unitViewLayerSource.includes(
    'const AI_LIVING_ACTIVITY_MARKER_VISUAL_ASSET_CONTRACT := "ai_living_activity_marker_visual_asset_v1"',
  ) &&
    unitViewLayerSource.includes(
      'const AI_LIVING_ACTIVITY_MARKER_FALLBACK_AVATAR_PATH := "res://assets/portraits/ai_chat/',
    ),
  'UnitViewLayer must expose the marker visual-asset contract and fallback portrait asset.',
);

assert.ok(
  unitViewLayerSource.includes(
    'func _resolve_ai_living_activity_runtime_item(ai_state: Dictionary, ai_player_id: String) -> Dictionary:',
  ) &&
    unitViewLayerSource.includes(
      'func _resolve_ai_living_activity_marker_avatar_path(runtime_item: Dictionary) -> String:',
    ) &&
    unitViewLayerSource.includes(
      'func _resolve_ai_living_activity_marker_target_line_vector(trace_item: Dictionary, marker_payload: Dictionary, target_tile_id: String) -> Vector2:',
    ),
  'UnitViewLayer must resolve living-marker avatar and target-line data from current AI runtime/trace state.',
);

for (const requiredPayloadField of [
  '"avatarImagePath"',
  '"statusDot"',
  '"targetLineVector"',
  '"targetLineVisible"',
  '"sourceTileId"',
]) {
  assert.ok(
    collectLivingMarkersSource.includes(requiredPayloadField),
    `living marker trace collector must emit ${requiredPayloadField}`,
  );
}

assert.ok(
  syncAiMapVisualsSource.includes('set_living_activity_visual_identity') &&
    syncAiMapVisualsSource.includes('marker_meta.get("avatarImagePath", "")') &&
    syncAiMapVisualsSource.includes('marker_meta.get("statusDot", "")') &&
    syncAiMapVisualsSource.includes('marker_meta.get("targetLineVector", Vector2.ZERO)') &&
    syncAiMapVisualsSource.includes('marker_meta.get("targetLineVisible", false)'),
  'UnitViewLayer must pass avatar/status/target-line fields into the map marker instance.',
);

for (const requiredSummaryField of [
  '"aiLivingActivityMarkerVisualAssetContract": AI_LIVING_ACTIVITY_MARKER_VISUAL_ASSET_CONTRACT',
  '"aiLivingActivityMarkerAvatarVisibleCount"',
  '"aiLivingActivityMarkerStatusBadgeVisibleCount"',
  '"aiLivingActivityMarkerTargetLineVisibleCount"',
  '"aiLivingActivityMarkerAvatarImagePaths"',
]) {
  assert.ok(summarySource.includes(requiredSummaryField), `visual debug summary is missing ${requiredSummaryField}`);
}

assert.ok(
  fixtureTraceSource.includes('trace_item["sourceTileId"] = "tile_08"') &&
    fixtureTraceSource.includes(
      'trace_item["avatarImagePath"] = "res://assets/portraits/ai_chat/zhao_yun_youth_changban_rescue_v1_avatar_160.png"',
    ) &&
    fixtureTraceSource.includes('marker_payload["sourceTileId"] = "tile_08"'),
  'formal fixture must seed a real avatar image and source tile so the map marker can prove a real target line.',
);

assert.ok(
  fs.existsSync(
    path.join(
      repoRoot,
      'godot-client/assets/portraits/ai_chat/zhao_yun_youth_changban_rescue_v1_avatar_160.png',
    ),
  ),
  'formal fixture portrait asset must exist in the repo.',
);

assert.ok(
  visualSmokeSource.includes('"world_ai_living_activity_layer_fixture"') &&
    visualSmokeSource.includes('aiLivingActivityMarkerVisualAssetContract') &&
    visualSmokeSource.includes('aiLivingActivityMarkerAvatarVisibleCount') &&
    visualSmokeSource.includes('aiLivingActivityMarkerTargetLineVisibleCount'),
  'visual smoke runner must retain living-marker visual asset summary fields.',
);

for (const closureNeedle of [
  'aiLivingActivityMarkerVisualAssetContract!=ai_living_activity_marker_visual_asset_v1',
  'aiLivingActivityMarkerAvatarVisibleCount<=0',
  'aiLivingActivityMarkerStatusBadgeVisibleCount<=0',
  'aiLivingActivityMarkerTargetLineVisibleCount<=0',
]) {
  assert.ok(closureBatchSource.includes(closureNeedle), `closure batch is missing ${closureNeedle}`);
}

console.log('[godot_main_world_ai_living_marker_visual_asset_contract] all checks passed');
