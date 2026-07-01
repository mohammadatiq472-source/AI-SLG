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
const gatewaySource = functionSource(hubOverlay, 'func _build_city_space_gateway() -> Control:')
const depthLayerSource = functionSource(hubOverlay, 'func _add_city_slg_camera_depth_layers(stage: Control, compact: bool) -> void:')
const depthTransitionSource = functionSource(hubOverlay, 'func _play_city_slg_camera_depth_transition(stage: Control) -> void:')

assert.ok(
  packageJson.includes('"test:godot:main-city-slg-camera-true-closure-contract"'),
  'package.json must expose the Stage 595 main-city SLG camera true-closure contract',
)

for (const requiredFact of [
  'SLG_CAMERA_TRUE_CLOSURE_CONTRACT_ID := "main_city_slg_camera_true_closure_v1"',
  'SLG_CAMERA_RAIL_TOKEN := "main_city_slg_camera_push_in_rail_v1"',
  'SLG_CAMERA_DEPTH_LAYER_TOKEN := "main_city_slg_camera_depth_layers_v1"',
  'SLG_CAMERA_STATES := "world_anchor|push_in|gate_parallax|city_depth|settle"',
]) {
  assert.ok(hubOverlay.includes(requiredFact), `MainCityHubOverlay must define ${requiredFact}`)
}

for (const requiredNode of [
  'MainCityCameraBackgroundCitySilhouette',
  'MainCityCameraMidgroundMarketBand',
  'MainCityCameraForegroundLeftGate',
  'MainCityCameraForegroundRightGate',
  'MainCityCameraLensRail',
]) {
  assert.ok(depthLayerSource.includes(requiredNode), `Stage 595 depth layer must create ${requiredNode}`)
}

assert.ok(
  gatewaySource.includes('_add_city_slg_camera_depth_layers(stage, compact)') &&
    gatewaySource.includes('_add_city_gatehouse_transition_layer(stage, compact)'),
  'main-city camera depth layers must be part of the real city-space surface before gatehouse layer',
)

for (const requiredField of [
  '"mainCitySlgCameraTrueClosureContractId"',
  '"mainCitySlgCameraRailToken"',
  '"mainCitySlgCameraDepthLayerToken"',
  '"mainCitySlgCameraStates"',
  '"mainCitySlgCameraProofLevel"',
  '"mainCitySlgCameraMovementFrameTargetCount"',
  '"mainCitySlgCameraRailVisible"',
  '"mainCitySlgCameraForegroundLayerVisible"',
  '"mainCitySlgCameraMidgroundLayerVisible"',
  '"mainCitySlgCameraBackgroundLayerVisible"',
  '"mainCitySlgCameraDepthLayerCount"',
  '"mainCitySlgCameraPreservesReducedMotionSkip"',
]) {
  assert.ok(worldOpenConfig.includes(requiredField), `world_open_main_city_hub must require ${requiredField}`)
  assert.ok(hubSummarySource.includes(requiredField), `MainCityHubOverlay summary must expose ${requiredField}`)
}

assert.ok(
  depthTransitionSource.includes('if _reduced_motion_enabled:') &&
    depthTransitionSource.includes('tween.parallel().tween_property') &&
    depthTransitionSource.includes('MainCityCameraForegroundLeftGate') &&
    depthTransitionSource.includes('MainCityCameraForegroundRightGate'),
  'Stage 595 camera depth transition must animate foreground/parallax and preserve reduced-motion fallback',
)

assert.ok(
  visualSmoke.includes('--sequence-capture-count') &&
    visualSmoke.includes('movementSequenceStats') &&
    currentHandoff.includes('--sequence-capture-count 3'),
  'Stage 595 must require the lightweight 3-frame movement evidence path',
)

for (const docFact of [
  'Stage 595 - Art / Frontend main-city SLG camera true-closure next slice',
  'npm.cmd run test:godot:main-city-slg-camera-true-closure-contract',
  'main_city_slg_camera_true_closure_v1',
]) {
  assert.ok(currentHandoff.includes(docFact), `CURRENT handoff must record ${docFact}`)
}

assert.ok(
  productIndex.includes('Stage 595 update: Art / Frontend main-city SLG camera true-closure next slice'),
  'product authority index must route future agents to Stage 595',
)

assert.ok(
  frontendAuthority.includes('## 2026-06-13 Stage 595 Main-city SLG camera true-closure update') &&
    frontendAuthority.includes('MainCityCameraLensRail'),
  'frontend authority must record the Stage 595 visible camera/depth slice',
)

assert.ok(
  motionAuthority.includes('## 2026-06-13 Stage 595 Main-City SLG Camera True-Closure Slice') &&
    motionAuthority.includes('main_city_slg_camera_true_closure_v1'),
  'motion authority must record the Stage 595 camera/depth packet',
)

console.log('[godot_main_city_slg_camera_true_closure_contract] all checks passed')
