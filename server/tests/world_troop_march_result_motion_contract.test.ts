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

const motionAuthority = read('docs/PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md')
const unitViewLayer = read('godot-client/scripts/map/unit_view_layer.gd')
const unitMarker = read('godot-client/scripts/map/unit_marker.gd')
const main = read('godot-client/scripts/app/main.gd')
const existingMarchContract = read('server/tests/world_troop_march_motion_contract.test.ts')
const packageJson = read('package.json')

const summarySource = functionSource(unitViewLayer, 'func get_visual_acceptance_summary() -> Dictionary:')
const resultBuilderSource = functionSource(unitViewLayer, 'func _build_world_troop_march_result_motion_summary(')
const marchActionSource = functionSource(main, 'func _press_mainline_visual_smoke_main_city_troop_submit_march_map_unit() -> Dictionary:')

assert.ok(
  motionAuthority.includes('## 2026-06-12 Troop March Result Motion Packet Contract') &&
    motionAuthority.includes('### `world_troop_march_result_motion_contract` Acceptance Sublanes'),
  'motion authority must define the troop march result packet and sublanes',
)

for (const state of [
  '`marching`',
  '`arrived`',
  '`intercepted`',
  '`retreating`',
  '`blocked`',
  '`result_anchor`',
]) {
  assert.ok(motionAuthority.includes(`| ${state} |`), `troop march result contract must cover ${state}`)
}

for (const requiredToken of [
  'worldTroopMarchResultMotionToken=world_troop_march_result_motion_v1',
  'worldTroopMarchArrivedMotion=true',
  'worldTroopMarchInterceptedMotion=true',
  'worldTroopMarchInterceptedFeedback=遭遇拦截',
  'worldTroopMarchRetreatingMotion=true',
  'worldTroopMarchRetreatingFeedback=部队撤回中',
  'worldTroopMarchBlockedMotion=true',
  'worldTroopMarchBlockedFeedback=行军受阻',
  'worldTroopMarchHistoryAnchor=true',
]) {
  assert.ok(motionAuthority.includes(requiredToken), `troop march result contract must require ${requiredToken}`)
}

for (const sublane of [
  'march_arrival_result_motion',
  'march_intercept_result_motion',
  'march_retreat_result_motion',
  'march_blocked_result_motion',
  'march_result_history_anchor',
]) {
  assert.ok(motionAuthority.includes(`| \`${sublane}\` |`), `troop march result contract must define ${sublane}`)
}

for (const forbidden of [
  'Treating countdown reaching',
  'Backend intercept receipt only',
  'Reusing forward march animation',
  'Silent failure',
  'Ephemeral toast with no durable anchor',
]) {
  assert.ok(motionAuthority.includes(forbidden), `troop march result contract must reject ${forbidden}`)
}

assert.ok(
  unitViewLayer.includes('const WORLD_TROOP_MARCH_MOTION_CONTRACT := "world_troop_march_motion_v1"') &&
    summarySource.includes('worldTroopMarchMotionOk') &&
    summarySource.includes('worldTroopMarchMotionPathCueCount') &&
    summarySource.includes('worldTroopMarchMotionTargetCueCount') &&
    summarySource.includes('worldTroopMarchMotionArrowCueCount'),
  'accepted narrow moving-march source facts must remain present',
)

assert.ok(
  unitMarker.includes('MOVING_UNIT_BODY_VISUAL_CONTRACT') &&
    unitMarker.includes('MOVING_UNIT_BODY_FRAME_SOURCE'),
  'moving-body visual contract and frame source must remain available for result motion to layer on top',
)

assert.ok(
  marchActionSource.includes('world_troop_march_motion_ok') &&
    marchActionSource.includes('"mapUnitVisualSummary": call("_compact_mainline_visual_smoke_map_unit_summary"') &&
    marchActionSource.includes('"returnedToMap"'),
  'existing troop-submit smoke must still expose compact map-unit evidence and return-to-map evidence',
)

assert.ok(
  existingMarchContract.includes('arrival/intercept/retreat/blocked feedback remains missing'),
  'existing narrow march contract must keep the remaining-result-states guard',
)

for (const notYetRuntimeField of [
  'worldTroopMarchResultMotionToken',
  'worldTroopMarchArrivedMotion',
  'worldTroopMarchInterceptedMotion',
  'worldTroopMarchInterceptedFeedback',
  'worldTroopMarchRetreatingMotion',
  'worldTroopMarchRetreatingFeedback',
  'worldTroopMarchBlockedMotion',
  'worldTroopMarchBlockedFeedback',
  'worldTroopMarchHistoryAnchor',
]) {
  assert.ok(
    summarySource.includes(notYetRuntimeField),
    `UnitViewLayer summary must expose runtime result-motion field ${notYetRuntimeField}`,
  )
  assert.ok(
    main.includes(notYetRuntimeField),
    `main.gd compact smoke summary and click action must retain ${notYetRuntimeField}`,
  )
}

assert.ok(
  summarySource.includes('WORLD_TROOP_MARCH_RESULT_MOTION_CONTRACT') &&
    summarySource.includes('_build_world_troop_march_result_motion_summary') &&
    summarySource.includes('world_troop_march_result_motion_ok') &&
    summarySource.includes('world_troop_march_motion_path_cue_count'),
  'UnitViewLayer summary must calculate result-state motion from current map-unit runtime facts',
)

assert.ok(
    marchActionSource.includes('world_troop_march_result_motion_ok') &&
    marchActionSource.includes('"worldTroopMarchResultMotionOk": world_troop_march_result_motion_ok') &&
    marchActionSource.includes('"worldTroopMarchArrivedMotion": bool(map_unit_summary.get("worldTroopMarchArrivedMotion", false))') &&
    marchActionSource.includes('"worldTroopMarchInterceptedMotion": bool(map_unit_summary.get("worldTroopMarchInterceptedMotion", false))') &&
    marchActionSource.includes('"worldTroopMarchInterceptedFeedback": str(map_unit_summary.get("worldTroopMarchInterceptedFeedback", ""))') &&
    marchActionSource.includes('"worldTroopMarchRetreatingMotion": bool(map_unit_summary.get("worldTroopMarchRetreatingMotion", false))') &&
    marchActionSource.includes('"worldTroopMarchRetreatingFeedback": str(map_unit_summary.get("worldTroopMarchRetreatingFeedback", ""))') &&
    marchActionSource.includes('"worldTroopMarchBlockedMotion": bool(map_unit_summary.get("worldTroopMarchBlockedMotion", false))') &&
    marchActionSource.includes('"worldTroopMarchBlockedFeedback": str(map_unit_summary.get("worldTroopMarchBlockedFeedback", ""))') &&
    marchActionSource.includes('"worldTroopMarchHistoryAnchor": bool(map_unit_summary.get("worldTroopMarchHistoryAnchor", false))'),
  'formal troop-submit smoke must bind its ok result to worldTroopMarchResultMotionOk',
)

assert.ok(
  main.includes('troopMarchResultMotionShellNavHardGate') &&
    main.includes('troop_march_result_motion_fixture_owns_map_unit_result_proof'),
  'formal troop-march result smoke must isolate unrelated shell-nav layout debt with an explicit summary reason',
)

assert.ok(
  main.includes('"worldTroopMarchResultStates": summary.get("worldTroopMarchResultStates", [])') &&
    main.includes('"worldTroopMarchResultMotionSummary": summary.get("worldTroopMarchResultMotionSummary", {})') &&
    main.includes('"worldTroopMarchInterceptedFeedback": str(summary.get("worldTroopMarchInterceptedFeedback", ""))') &&
    main.includes('"worldTroopMarchRetreatingFeedback": str(summary.get("worldTroopMarchRetreatingFeedback", ""))') &&
    main.includes('"worldTroopMarchBlockedFeedback": str(summary.get("worldTroopMarchBlockedFeedback", ""))'),
  'compact map-unit summary must preserve result states and result-motion details for sequence frames',
)

assert.ok(
  resultBuilderSource.includes('var blocked_motion := (') &&
    summarySource.includes('world_troop_march_motion_path_cue_count') &&
    resultBuilderSource.includes('path_cue_count <= 0') &&
    resultBuilderSource.includes('"blockedFeedback": "行军受阻"'),
  'blocked march result must turn current missing-route runtime facts into a player-safe blocked feedback state',
)

assert.ok(
  motionAuthority.includes('Stage 583 Motion gameplay feedback beyond recruit status') &&
    motionAuthority.includes('blocked route/no-route result is now `code_chain`') &&
    motionAuthority.includes('worldTroopMarchBlockedMotion=false remains open only for live screenshot acceptance, not source-level blocked-state proof'),
  'motion authority must record Stage 583 blocked route/no-route code_chain without overclaiming visual acceptance',
)

assert.ok(
  resultBuilderSource.includes('var retreating_unit_ids: Array = []') &&
    resultBuilderSource.includes('_unit_has_retreating_result_motion(unit, map_visual)') &&
    resultBuilderSource.includes('"retreatingFeedback": "部队撤回中"') &&
    resultBuilderSource.includes('states.append("retreating")') &&
    unitViewLayer.includes('func _unit_has_retreating_result_motion(unit: Dictionary, map_visual: Dictionary) -> bool:'),
  'Stage 588 must derive retreating march result from current unit/mapVisual state and expose safe feedback',
)

assert.ok(
  motionAuthority.includes('Stage 588 Motion gameplay feedback next slice status') &&
    motionAuthority.includes('retreating march result is now `code_chain`') &&
    motionAuthority.includes('worldTroopMarchRetreatingMotion=false remains open only for live screenshot acceptance, not source-level retreat-state proof'),
  'motion authority must record Stage 588 retreating source proof without overclaiming visual acceptance',
)

assert.ok(
  resultBuilderSource.includes('var intercepted_unit_ids: Array = []') &&
    resultBuilderSource.includes('_unit_has_intercepted_result_motion(unit, map_visual)') &&
    resultBuilderSource.includes('"interceptedFeedback": "遭遇拦截"') &&
    resultBuilderSource.includes('states.append("intercepted")') &&
    unitViewLayer.includes('func _unit_has_intercepted_result_motion(unit: Dictionary, map_visual: Dictionary) -> bool:'),
  'Stage 593 must derive intercepted march result from current unit/mapVisual state and expose safe feedback',
)

assert.ok(
  motionAuthority.includes('Stage 593 Motion intercepted or screenshot-backed march feedback next slice status') &&
    motionAuthority.includes('intercepted march result is now `code_chain`') &&
    motionAuthority.includes('worldTroopMarchInterceptedMotion=false remains open only for live screenshot acceptance, not source-level intercept-state proof'),
  'motion authority must record Stage 593 intercepted source proof without overclaiming visual acceptance',
)

assert.ok(
  packageJson.includes('"test:world:troop-march-result-motion-contract": "tsx server/tests/world_troop_march_result_motion_contract.test.ts"'),
  'package.json must expose the troop march result motion contract test as a formal entry',
)

console.log('[world_troop_march_result_motion_contract] all checks passed')
