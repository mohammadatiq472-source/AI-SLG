import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const mainSource = fs.readFileSync(path.join(repoRoot, 'godot-client/scripts/app/main.gd'), 'utf8');
const visualSmokeSource = fs.readFileSync(path.join(repoRoot, 'godot-client/tools/run_mainline_visual_smoke.py'), 'utf8');
const manifestPath = path.join(repoRoot, 'godot-client/data/ui/sea_overseas_naval_unit_frames_manifest_v1.json');
const landManifestPath = path.join(repoRoot, 'godot-client/assets/themes/slgclient/manifests/unit_frames_manifest.json');

const clickAction = 'world_sea_overseas_naval_frame_preview';
const expectedSlots = [
  'naval_light_patrol_warship_v1',
  'naval_interceptor_warship_v1',
  'naval_transport_warship_v1',
] as const;

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
  status?: string;
  movingBodyFramePolicy?: {
    connectionStatus?: string;
  };
  requiredMovingBodies?: Array<{
    slotId?: string;
    assetStatus?: string;
    targetRoot?: string;
    frameNamingPattern?: string;
    requiredFrameCount?: number;
  }>;
};

assert.equal(manifest.status, 'frame_batch_ready_pending_runtime_adapter');
assert.equal(manifest.movingBodyFramePolicy?.connectionStatus, 'brief_only_not_connected_to_runtime_unit_marker');

for (const slotId of expectedSlots) {
  const body = manifest.requiredMovingBodies?.find((candidate) => candidate.slotId === slotId);
  assert.ok(body, `missing naval body ${slotId}`);
  assert.equal(body.assetStatus, 'pending_runtime_adapter', `${slotId} must remain pending runtime adapter`);
  assert.equal(body.requiredFrameCount, 80, `${slotId} must still require 80 frames`);

  const frameRoot = path.join(repoRoot, 'godot-client', String(body.targetRoot).replace('res://', ''));
  assert.ok(fs.existsSync(frameRoot), `${slotId} frame root must exist`);
  const frameFiles = fs.readdirSync(frameRoot).filter((name) => name.endsWith('.png'));
  const importFiles = fs.readdirSync(frameRoot).filter((name) => name.endsWith('.png.import'));
  assert.equal(frameFiles.length, 80, `${slotId} must have 80 PNG frames`);
  assert.equal(importFiles.length, 80, `${slotId} must have 80 Godot import metadata files`);
}

assert.ok(
  mainSource.includes(`"${clickAction}"`) &&
    mainSource.includes('func _press_mainline_visual_smoke_world_sea_overseas_naval_frame_preview() -> Dictionary:'),
  'main.gd must expose the W13.1 naval frame preview click action.',
);

for (const requiredField of [
  'worldSeaOverseasNavalFramePreviewOk',
  'worldSeaOverseasNavalFramePreviewVisibleSlotCount',
  'worldSeaOverseasNavalFramePreviewSlots',
  'worldSeaOverseasNavalFramePreviewManifestStatus',
  'worldSeaOverseasNavalFramePreviewConnectionStatus',
  'worldSeaOverseasNavalFramePreviewLandManifestUntouched',
  'worldSeaOverseasNavalFramePreviewDoesNotUseUnitMarker',
]) {
  assert.ok(mainSource.includes(requiredField), `main.gd preview summary must expose ${requiredField}`);
  assert.ok(visualSmokeSource.includes(`"${requiredField}"`), `visual smoke must require summary field ${requiredField}`);
}

assert.ok(
  visualSmokeSource.includes(`"${clickAction}"`) &&
    visualSmokeSource.includes('"worldSeaOverseasNavalFramePreviewOk"'),
  'run_mainline_visual_smoke.py must whitelist and require the W13.1 naval preview action.',
);

const landManifestText = fs.readFileSync(landManifestPath, 'utf8');
for (const slotId of expectedSlots) {
  assert.ok(!landManifestText.includes(slotId), `land UnitMarker manifest must not reference naval slot ${slotId}`);
}

assert.ok(
  !mainSource.includes('NAVAL_UNIT_MARKER_ADAPTER_READY') &&
    !mainSource.includes('naval_runtime_movement_adapter_ready'),
  'W13.1 must stay a preview/preflight and not claim a runtime naval UnitMarker adapter.',
);

console.log('[godot_sea_overseas_naval_frame_preview_contract] all checks passed');
