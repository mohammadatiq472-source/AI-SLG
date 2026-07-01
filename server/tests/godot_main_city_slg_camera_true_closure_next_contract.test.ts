import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function functionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const nextFunc = source.indexOf('\nfunc ', start + signature.length)
  const nextStaticFunc = source.indexOf('\nstatic func ', start + signature.length)
  const candidates = [nextFunc, nextStaticFunc].filter((index) => index > start)
  const end = candidates.length > 0 ? Math.min(...candidates) : source.length
  return source.slice(start, end)
}

const packageJson = read('package.json')
const visualSmoke = read('godot-client/tools/run_mainline_visual_smoke.py')
const hubOverlay = read('godot-client/scripts/ui/main_city_hub_overlay.gd')
const motionAuthority = read('docs/PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md')
const frontendAuthority = read('docs/PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md')
const productIndex = read('docs/PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md')
const currentHandoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')

const worldOpenConfig = visualSmoke.slice(
  visualSmoke.indexOf('"world_open_main_city_hub": {'),
  visualSmoke.indexOf('"world_open_main_city_hub_jump_coordinate": {'),
)
const hubSummarySource = functionSource(hubOverlay, 'func get_context_summary() -> Dictionary:')
const depthLayerSource = functionSource(hubOverlay, 'func _add_city_slg_camera_depth_layers(stage: Control, compact: bool) -> void:')
const depthTransitionSource = functionSource(hubOverlay, 'func _play_city_slg_camera_depth_transition(stage: Control) -> void:')

assert.ok(
  packageJson.includes('"test:godot:main-city-slg-camera-true-closure-next-contract"'),
  'package.json must expose the Stage 600 main-city SLG camera next contract',
)

for (const requiredFact of [
  'SLG_CAMERA_PUSH_MOTION_STAGE600_CONTRACT_ID := "main_city_slg_camera_push_motion_stage600_v1"',
  'SLG_CAMERA_PUSH_MARKER_TOKEN := "main_city_slg_camera_push_marker_v1"',
  'SLG_CAMERA_PUSH_TRAIL_TOKEN := "main_city_slg_camera_push_trail_v1"',
  'SLG_CAMERA_PUSH_MOTION_STATES := "approach_gate|push_along_rail|foreground_pass|settle_in_city"',
  'SLG_CAMERA_PUSH_MOTION_DURATION_SEC := 0.48',
]) {
  assert.ok(hubOverlay.includes(requiredFact), `MainCityHubOverlay must define ${requiredFact}`)
}

for (const requiredNode of [
  'MainCityCameraPushTrail',
  'MainCityCameraPushMarker',
  'MainCityCameraPushSettleHalo',
]) {
  assert.ok(depthLayerSource.includes(requiredNode), `Stage 600 camera motion surface must create ${requiredNode}`)
}

for (const requiredField of [
  '"mainCitySlgCameraPushMotionStage600ContractId"',
  '"mainCitySlgCameraPushMarkerToken"',
  '"mainCitySlgCameraPushTrailToken"',
  '"mainCitySlgCameraPushMotionStates"',
  '"mainCitySlgCameraPushMotionDurationSec"',
  '"mainCitySlgCameraPushMotionFrameTargetCount"',
  '"mainCitySlgCameraPushMarkerVisible"',
  '"mainCitySlgCameraPushTrailVisible"',
  '"mainCitySlgCameraPushSettleHaloVisible"',
  '"mainCitySlgCameraPushMotionPreservesReducedMotionSkip"',
]) {
  assert.ok(worldOpenConfig.includes(requiredField), `world_open_main_city_hub must require ${requiredField}`)
  assert.ok(hubSummarySource.includes(requiredField), `MainCityHubOverlay summary must expose ${requiredField}`)
}

assert.ok(
  depthTransitionSource.includes('push_marker') &&
    depthTransitionSource.includes('settle_halo') &&
    depthTransitionSource.includes('tween.parallel().tween_property(push_marker, "position"') &&
    depthTransitionSource.includes('SLG_CAMERA_PUSH_MOTION_DURATION_SEC') &&
    depthTransitionSource.includes('if _reduced_motion_enabled:'),
  'Stage 600 must animate the push marker along the camera rail and preserve reduced-motion fallback',
)

assert.ok(
  currentHandoff.includes('--sequence-capture-count 4') &&
    visualSmoke.includes('--sequence-capture-count') &&
    visualSmoke.includes('movementSequenceStats'),
  'Stage 600 must require the lightweight 4-frame movement evidence path',
)

for (const docFact of [
  'Stage 600 - Art / Frontend main-city SLG camera true closure next slice',
  'npm.cmd run test:godot:main-city-slg-camera-true-closure-next-contract',
  'main_city_slg_camera_push_motion_stage600_v1',
]) {
  assert.ok(currentHandoff.includes(docFact), `CURRENT handoff must record ${docFact}`)
}

assert.ok(
  productIndex.includes('Stage 600 update: Art / Frontend main-city SLG camera true closure next slice'),
  'product authority index must route future agents to Stage 600',
)

assert.ok(
  frontendAuthority.includes('## 2026-06-13 Stage 600 Main-city SLG camera push-motion update') &&
    frontendAuthority.includes('MainCityCameraPushMarker'),
  'frontend authority must record the Stage 600 visible push-motion marker',
)

assert.ok(
  motionAuthority.includes('## 2026-06-13 Stage 600 Main-City SLG Camera Push-Motion Slice') &&
    motionAuthority.includes('main_city_slg_camera_push_motion_stage600_v1'),
  'motion authority must record the Stage 600 camera push-motion packet',
)

console.log('[godot_main_city_slg_camera_true_closure_next_contract] all checks passed')
