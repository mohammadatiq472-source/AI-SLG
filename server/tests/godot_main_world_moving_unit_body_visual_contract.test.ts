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
  const nextFunc = source.indexOf('\nfunc ', start + signature.length);
  const nextStaticFunc = source.indexOf('\nstatic func ', start + signature.length);
  const candidates = [nextFunc, nextStaticFunc].filter((index) => index > start);
  const end = candidates.length > 0 ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
};

const bodyContract = 'main_world_moving_unit_body_visual_v1';
const frameSource = 'unit_frames_manifest_v2_visual_types';
const manifestPath = 'res://assets/themes/slgclient/manifests/unit_frames_manifest.json';

const unitMarkerSource = readSource('godot-client/scripts/map/unit_marker.gd');
const unitViewLayerSource = readSource('godot-client/scripts/map/unit_view_layer.gd');
const mainSource = readSource('godot-client/scripts/app/main.gd');
const manifestSource = readSource('godot-client/assets/themes/slgclient/manifests/unit_frames_manifest.json');
const fixtureSource = readSource('godot-client/data/ui_preview/stories/map_units_story.json');

const markerDebugSource = functionSource(unitMarkerSource, 'func get_visual_debug_state() -> Dictionary:');
const applyFrameSource = functionSource(unitMarkerSource, 'func _apply_current_frame(force_reset: bool) -> void:');
const loadFramesSource = functionSource(unitMarkerSource, 'static func _ensure_shared_frames_loaded() -> void:');
const summarySource = functionSource(unitViewLayerSource, 'func get_visual_acceptance_summary() -> Dictionary:');
const compactMapUnitSummarySource = functionSource(mainSource, 'func _compact_mainline_visual_smoke_map_unit_summary(summary: Dictionary) -> Dictionary:');

assert.ok(
  unitMarkerSource.includes(`const MOVING_UNIT_BODY_VISUAL_CONTRACT: String = "${bodyContract}"`) &&
    unitMarkerSource.includes(`const MOVING_UNIT_BODY_FRAME_SOURCE: String = "${frameSource}"`) &&
    unitMarkerSource.includes(`const UNIT_MANIFEST_PATH: String = "${manifestPath}"`),
  'UnitMarker must expose a stable moving-unit body visual contract and frame-manifest source.',
);

assert.ok(
  loadFramesSource.includes('manifest.get("visualTypes", {})') &&
    loadFramesSource.includes('_build_cooked_frames_by_direction(raw_directions)') &&
    loadFramesSource.includes('_shared_frames_by_visual_type[visual_type_key]'),
  'UnitMarker must keep loading moving-unit body frames from unit_frames_manifest.visualTypes.',
);

assert.ok(
  applyFrameSource.includes('_uses_formation_slots()') &&
    applyFrameSource.includes('_resolve_frames_for_direction(str(slot.get("visualType", DEFAULT_VISUAL_TYPE)), _direction_key)') &&
    applyFrameSource.includes('formation_sprite.texture = slot_frame.get("texture", null) as Texture2D') &&
    applyFrameSource.includes('_sprite.texture = frame_texture'),
  'UnitMarker must animate the moving body via visualType direction frames, including formation slots.',
);

assert.ok(
  !unitMarkerSource.includes('generated_troops') &&
    !unitMarkerSource.includes('generated_troop_illustration_for_label') &&
    !unitMarkerSource.includes('generated_troops_illustration_v1'),
  'UnitMarker moving body must not directly consume generated_troops foreground/UI assets.',
);

for (const requiredField of [
  'movingUnitBodyVisualContract',
  'movingUnitBodyFrameSource',
  'movingUnitBodyFrameManifestPath',
  'movingUnitBodyUsesGeneratedTroopsForeground',
  'movingUnitBodyDirectionCount',
  'movingUnitBodyFrameCountByVisualType',
  'movingUnitBodyFormationSlotCount',
  'movingUnitBodyFormationVisualTypes',
]) {
  assert.ok(markerDebugSource.includes(requiredField), `UnitMarker debug state must expose ${requiredField}.`);
}

assert.ok(
  unitViewLayerSource.includes('func _resolve_formation_slots(unit: Dictionary) -> Array:') &&
    unitViewLayerSource.includes('map_visual.get("formationSlots", [])'),
  'UnitViewLayer must read backend mapVisual formationSlots.',
);
for (const visualTypeToken of ['VISUAL_TYPE_INFANTRY', 'VISUAL_TYPE_CAVALRY', 'VISUAL_TYPE_ARCHER']) {
  assert.ok(unitViewLayerSource.includes(visualTypeToken), `UnitViewLayer formation slot resolver must preserve ${visualTypeToken}.`);
}
assert.ok(
  unitViewLayerSource.includes('"visualType": visual_type'),
  'UnitViewLayer must pass resolved slot visualType into UnitMarker.',
);

for (const requiredField of [
  'movingUnitBodyVisualContract',
  'movingUnitBodyFrameSource',
  'movingUnitBodyFrameManifestPath',
  'movingUnitBodyUsesGeneratedTroopsForeground',
  'movingUnitBodyFormationMarkerCount',
  'movingUnitBodyFormationVisualTypes',
  'movingUnitBodyVisualTypes',
]) {
  assert.ok(summarySource.includes(requiredField), `UnitViewLayer summary must aggregate ${requiredField}.`);
}

for (const requiredField of [
  'movingUnitBodyVisualContract',
  'movingUnitBodyFrameSource',
  'movingUnitBodyFrameManifestPath',
  'movingUnitBodyUsesGeneratedTroopsForeground',
  'movingUnitBodyFormationMarkerCount',
  'movingUnitBodyFormationVisualTypes',
  'movingUnitBodyVisualTypes',
]) {
  assert.ok(compactMapUnitSummarySource.includes(requiredField), `mainline compact map-unit summary must retain ${requiredField}.`);
}

const manifest = JSON.parse(manifestSource) as {
  schemaVersion?: string;
  visualTypes?: Record<string, { directions?: Record<string, Array<{ texturePath?: string }>> }>;
};
assert.equal(manifest.schemaVersion, frameSource, 'unit frame manifest schema should match the moving body frame source token.');

for (const visualType of ['infantry', 'cavalry', 'archer']) {
  const payload = manifest.visualTypes?.[visualType];
  assert.ok(payload, `unit frame manifest must expose ${visualType}.`);
  for (const direction of ['r', 'ru', 'u', 'lu', 'l', 'ld', 'd', 'rd']) {
    const frames: Array<{ texturePath?: string }> | undefined = payload.directions?.[direction];
    assert.equal(frames?.length, 10, `${visualType}.${direction} must keep 10 moving-unit frames.`);
    for (const frame of frames ?? []) {
      assert.ok(String(frame.texturePath ?? '').startsWith('res://assets/themes/slgclient/current/units/'), `${visualType}.${direction} frame path must stay under current unit assets.`);
    }
  }
}

assert.ok(
  fixtureSource.includes('"formationSlots"') &&
    fixtureSource.includes('"visualType": "infantry"') &&
    fixtureSource.includes('"visualType": "cavalry"') &&
    fixtureSource.includes('"visualType": "archer"'),
  'formal map unit story fixture must keep a mixed three-visualType formation sample.',
);

console.log('[godot_main_world_moving_unit_body_visual_contract] all checks passed');
