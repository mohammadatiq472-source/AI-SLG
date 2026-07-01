import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function functionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  if (start < 0) {
    return ''
  }
  const nextFunc = source.indexOf('\nfunc ', start + signature.length)
  const nextStaticFunc = source.indexOf('\nstatic func ', start + signature.length)
  const candidates = [nextFunc, nextStaticFunc].filter((index) => index > start)
  const end = candidates.length > 0 ? Math.min(...candidates) : source.length
  return source.slice(start, end)
}

const contract = 'world_troop_march_motion_v1'
const movingBodyContract = 'main_world_moving_unit_body_visual_v1'
const frameSource = 'unit_frames_manifest_v2_visual_types'

const unitViewLayer = read('godot-client/scripts/map/unit_view_layer.gd')
const unitPathLayer = read('godot-client/scripts/map/unit_path_layer.gd')
const unitMarker = read('godot-client/scripts/map/unit_marker.gd')
const main = read('godot-client/scripts/app/main.gd')
const runner = read('godot-client/tools/run_mainline_visual_smoke.py')
const packageJson = read('package.json')
const motionAuthority = read('docs/PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md')

const summarySource = functionSource(unitViewLayer, 'func get_visual_acceptance_summary() -> Dictionary:')
const compactSummarySource = functionSource(main, 'func _compact_mainline_visual_smoke_map_unit_summary(summary: Dictionary) -> Dictionary:')
const marchActionSource = functionSource(main, 'func _press_mainline_visual_smoke_main_city_troop_submit_march_map_unit() -> Dictionary:')
const sequenceSource = functionSource(main, 'func _capture_mainline_visual_smoke_sequence(frame_count: int, interval_sec: float) -> Dictionary:')

assert.ok(
  unitViewLayer.includes(`const WORLD_TROOP_MARCH_MOTION_CONTRACT := "${contract}"`),
  'UnitViewLayer must expose the stable troop march motion contract token.',
)

assert.ok(
  unitMarker.includes(`const MOVING_UNIT_BODY_VISUAL_CONTRACT: String = "${movingBodyContract}"`) &&
    unitMarker.includes(`const MOVING_UNIT_BODY_FRAME_SOURCE: String = "${frameSource}"`),
  'Troop march motion must keep using the current moving-unit body frame contract.',
)

assert.ok(
  unitPathLayer.includes('func get_visual_debug_summary() -> Dictionary:') &&
    unitPathLayer.includes('"pathCount"') &&
    unitPathLayer.includes('"targetCount"') &&
    unitPathLayer.includes('"arrowEstimateCount"'),
  'UnitPathLayer must keep observable route, destination, and arrow cue counts.',
)

for (const requiredField of [
  'worldTroopMarchMotionContract',
  'worldTroopMarchMotionOk',
  'worldTroopMarchMotionMovingUnitCount',
  'worldTroopMarchMotionMovingUnitIds',
  'worldTroopMarchMotionPathCueCount',
  'worldTroopMarchMotionTargetCueCount',
  'worldTroopMarchMotionArrowCueCount',
  'worldTroopMarchMotionMovingBodyContract',
  'worldTroopMarchMotionFrameSource',
]) {
  assert.ok(summarySource.includes(requiredField), `UnitViewLayer summary must expose ${requiredField}.`)
  assert.ok(compactSummarySource.includes(requiredField), `main.gd compact map-unit summary must retain ${requiredField}.`)
}

assert.ok(
  summarySource.includes('marker_summary.get("moving", false)') &&
    summarySource.includes('march_display_summary.get("active", false)') &&
    summarySource.includes('path_summary.get("pathCount", 0)') &&
    summarySource.includes('path_summary.get("targetCount", 0)') &&
    summarySource.includes('path_summary.get("arrowEstimateCount", 0)') &&
    summarySource.includes('not moving_unit_body_uses_generated_troops_foreground'),
  'Troop march motion acceptance must require moving unit state, route cue, target cue, arrow cue, and non-generated moving body proof.',
)

assert.ok(
  marchActionSource.includes('var world_troop_march_motion_ok := bool(map_unit_summary.get("worldTroopMarchMotionOk", false))') &&
    marchActionSource.includes('and world_troop_march_motion_ok') &&
    marchActionSource.includes('"worldTroopMarchMotionOk": world_troop_march_motion_ok'),
  'Formal troop-submit march smoke must bind its ok result to worldTroopMarchMotionOk.',
)

assert.ok(
  sequenceSource.includes('var map_unit_visual_summary: Dictionary = call("_compact_mainline_visual_smoke_map_unit_summary"') &&
    sequenceSource.includes('"mapUnitVisual": map_unit_visual_summary') &&
    runner.includes('sequence_requires_map_unit_artifacts = args.click_action in {') &&
    runner.includes('"world_click_main_city_node_troop_submit_march_map_unit",') &&
    runner.includes('movementSequenceStats'),
  'Formal movement sequence capture must preserve compact map-unit motion evidence and movement artifacts.',
)

assert.ok(
  packageJson.includes('"test:world:troop-march-motion-contract": "tsx server/tests/world_troop_march_motion_contract.test.ts"'),
  'package.json must expose the troop march motion contract test as a formal entry.',
)

assert.ok(
  motionAuthority.includes(contract) &&
    motionAuthority.includes('world_troop_march_motion_contract') &&
    motionAuthority.includes('moving unit, route cue, destination cue, arrow cue') &&
    motionAuthority.includes('arrival/intercept/retreat/blocked feedback remains missing'),
  'Motion authority must record the accepted narrow troop march slice and remaining gaps.',
)

console.log('[world_troop_march_motion_contract] all checks passed')
