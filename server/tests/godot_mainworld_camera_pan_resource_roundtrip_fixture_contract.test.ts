import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mainSource = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const visualSmokeSource = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

function assertIncludes(source: string, needle: string, message: string) {
  assert.ok(source.includes(needle), message)
}

for (const source of [mainSource, visualSmokeSource]) {
  assertIncludes(
    source,
    'world_mainworld_camera_pan_resource_roundtrip_fixture',
    'mainworld camera pan resource roundtrip fixture must be a formal Godot smoke action',
  )
}

for (const field of [
  'mainWorldCameraPanResourceRoundtripOk',
  'mainWorldMapVisibleBefore',
  'mainWorldMapVisibleAfterPan',
  'cameraStartCell',
  'cameraEndCell',
  'cameraPanDeltaCells',
  'viewportLoadedChunkIdsBefore',
  'viewportLoadedChunkIdsAfter',
  'resourceHudAfterPanOk',
  'resourceTileSelectedAfterPan',
  'resourceOccupationAfterPanReadbackOk',
  'firstHourLandLoopIntegratedClickToTaskReadbackOk',
  'taskProgressAutoAdvanced',
  'playerVisibleEngineeringCopyLeak',
  'visibleCopyForbiddenHits',
]) {
  assertIncludes(mainSource, field, `Godot fixture must expose ${field}`)
  assertIncludes(visualSmokeSource, field, `visual smoke runner must require ${field}`)
}

assertIncludes(
  mainSource,
  '_run_mainworld_camera_pan_resource_roundtrip_fixture',
  'Godot fixture should use a dedicated minimal action handler',
)
assertIncludes(
  mainSource,
  '_read_mainworld_camera_pan_roundtrip_state',
  'Godot fixture should read map/camera state before and after pan',
)
assertIncludes(
  mainSource,
  '_run_first_hour_land_loop_integrated_click_to_task_readback_gate',
  'Godot fixture should reuse the accepted Stage 197 resource occupation/readback chain after pan',
)

assertIncludes(
  visualSmokeSource,
  '_validate_mainworld_camera_pan_resource_roundtrip_contract',
  'visual smoke runner should validate the camera pan roundtrip contract',
)

console.log('[godot_mainworld_camera_pan_resource_roundtrip_fixture_contract] all checks passed')
