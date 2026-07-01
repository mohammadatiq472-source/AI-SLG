import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const mainSource = fs.readFileSync(path.join(repoRoot, 'godot-client/scripts/app/main.gd'), 'utf8');
const visualSmokeSource = fs.readFileSync(
  path.join(repoRoot, 'godot-client/tools/run_mainline_visual_smoke.py'),
  'utf8',
);
const legacyInterceptContract = fs.readFileSync(
  path.join(repoRoot, 'server/tests/godot_sea_patrol_intercept_fixture_contract.test.ts'),
  'utf8',
);

const clickAction = 'world_sea_patrol_intercept_report_fixture';
const contractToken = 'sea_patrol_intercept_naval_frame_route_feedback_v1';

assert.ok(
  mainSource.includes('func _resolve_mainline_visual_smoke_naval_route_feedback(') &&
    mainSource.includes(contractToken),
  'Godot must expose a narrow naval-frame route-feedback resolver for the sea patrol intercept fixture.',
);

for (const marker of [
  'worldSeaPatrolInterceptNavalFrameRouteFeedbackContract',
  'worldSeaPatrolInterceptNavalFrameRouteFeedbackOk',
  'worldSeaPatrolInterceptNavalFrameRouteFeedbackStatus',
  'worldSeaPatrolInterceptNavalFrameRouteFeedbackVisibleCount',
  'worldSeaPatrolInterceptAttackerFrameSlotId',
  'worldSeaPatrolInterceptDefenderFrameSlotId',
  'worldSeaPatrolInterceptNavalFrameRouteTextureLoadedBySlot',
  'worldSeaPatrolInterceptNavalFrameRouteDoesNotUseUnitMarker',
  'worldSeaPatrolInterceptNavalFrameRouteMovementRuntimeStatus',
]) {
  assert.ok(mainSource.includes(marker), `intercept fixture summary must expose ${marker}.`);
  assert.ok(visualSmokeSource.includes(`"${marker}"`), `formal visual smoke must require ${marker}.`);
}

assert.ok(
  mainSource.includes('"interceptor_warship": "naval_interceptor_warship_v1"') &&
    mainSource.includes('"transport_warship": "naval_transport_warship_v1"'),
  'route feedback must map W11 vessel types to W13 naval frame slots.',
);

assert.ok(
  mainSource.includes('"route_feedback_preview_only_no_unit_marker"') &&
    mainSource.includes('"preview_only_no_sea_runtime_movement"'),
  'route feedback must be explicit that this is not a naval UnitMarker or full sea movement runtime.',
);

assert.ok(
  !mainSource.includes('not_generated_requires_separate_imagegen_window'),
  'intercept fixture must no longer claim the three warship frame batches are not generated.',
);

assert.ok(
  legacyInterceptContract.includes(contractToken) &&
    !legacyInterceptContract.includes('not_generated_requires_separate_imagegen_window'),
  'existing intercept fixture contract must be updated away from the stale not-generated image batch status.',
);

assert.ok(
  visualSmokeSource.includes(`"${clickAction}"`) &&
    visualSmokeSource.includes('"worldSeaPatrolInterceptNavalFrameRouteFeedbackOk"'),
  'formal sea patrol intercept smoke must keep the existing click action and require naval frame route feedback.',
);

console.log('[godot_sea_patrol_intercept_naval_frame_route_feedback_contract] all checks passed');
