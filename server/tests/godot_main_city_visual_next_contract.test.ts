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
const aiAuthority = read('docs/PRODUCT_AUTHORITY_AI_PLAYER_GOVERNANCE_CURRENT_2026_06_10.md')
const productIndex = read('docs/PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md')
const currentHandoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')

const worldOpenConfig = visualSmoke.slice(
  visualSmoke.indexOf('"world_open_main_city_hub": {'),
  visualSmoke.indexOf('"world_open_main_city_hub_jump_coordinate": {'),
)
const hubSummarySource = functionSource(hubOverlay, 'func get_context_summary() -> Dictionary:')
const buildContextPanelSource = functionSource(hubOverlay, 'func _build_context_panel() -> void:')
const stageTransitionSource = functionSource(hubOverlay, 'func _play_city_space_stage_transition(city_model: TextureRect) -> void:')
const maskTransitionSource = functionSource(hubOverlay, 'func _play_main_city_enter_transition_mask() -> void:')

assert.ok(
  packageJson.includes('"test:godot:main-city-visual-next-contract"'),
  'package.json must expose the Stage 590 main-city visual next contract',
)

for (const requiredFact of [
  'REDUCED_MOTION_SKIP_CONTRACT_ID := "main_city_reduced_motion_skip_ux_v1"',
  'REDUCED_MOTION_SKIP_BUTTON_TOKEN := "main_city_reduced_motion_skip_button_v1"',
  'REDUCED_MOTION_SKIP_ACTION_ID := "main_city_motion_skip_toggle"',
  'REDUCED_MOTION_SKIP_PLAYER_LABEL := "简略动效"',
  'MainCityReducedMotionSkipButton',
  '减少主城转场动效',
]) {
  assert.ok(hubOverlay.includes(requiredFact), `MainCityHubOverlay must define ${requiredFact}`)
}

for (const requiredField of [
  '"mainCityReducedMotionSkipContractId"',
  '"mainCityReducedMotionSkipButtonToken"',
  '"mainCityReducedMotionSkipActionId"',
  '"mainCityReducedMotionSkipPlayerLabel"',
  '"mainCityReducedMotionSkipButtonVisible"',
  '"mainCityReducedMotionSkipButtonNodeName"',
  '"mainCityReducedMotionEnabled"',
  '"mainCityReducedMotionSkipsTransitionMask"',
  '"mainCityReducedMotionSkipsStageTween"',
]) {
  assert.ok(worldOpenConfig.includes(requiredField), `world_open_main_city_hub must require ${requiredField}`)
  assert.ok(hubSummarySource.includes(requiredField), `MainCityHubOverlay summary must expose ${requiredField}`)
}

assert.ok(
  buildContextPanelSource.includes('_reduced_motion_button = _make_context_action_button(REDUCED_MOTION_SKIP_PLAYER_LABEL)') &&
    buildContextPanelSource.includes('toggle_mode = true') &&
    buildContextPanelSource.includes('main_city_reduced_motion_skip_action_id') &&
    buildContextPanelSource.includes('_on_reduced_motion_button_pressed'),
  'main-city reduced-motion UX must be a real Godot toggle button with an action id',
)

assert.ok(
  stageTransitionSource.includes('if _reduced_motion_enabled:') &&
    stageTransitionSource.includes('city_model.scale = Vector2.ONE') &&
    maskTransitionSource.includes('if _reduced_motion_enabled:') &&
    maskTransitionSource.includes('_enter_transition_mask.visible = false'),
  'reduced-motion mode must skip the main-city stage tween and transition mask',
)

for (const forbiddenVisibleText of ['read model', 'authority', 'tier', 'contract id', 'fixture', 'backend', 'debug']) {
  assert.equal(
    hubOverlay.includes(`"${forbiddenVisibleText}"`),
    false,
    `MainCityHubOverlay player-facing quoted text must not expose ${forbiddenVisibleText}`,
  )
}

for (const docFact of [
  'Stage 590 - main-city reduced-motion / skip and AI switch home-city visual next slice',
  'npm.cmd run test:godot:main-city-visual-next-contract',
  'main_city_reduced_motion_skip_ux_v1',
]) {
  assert.ok(currentHandoff.includes(docFact), `CURRENT handoff must record ${docFact}`)
}

assert.ok(
  productIndex.includes('Stage 590 update: main-city reduced-motion / skip and AI switch home-city visual next slice'),
  'product authority index must route future agents to Stage 590',
)

assert.ok(
  frontendAuthority.includes('## 2026-06-13 Stage 590 Main-city reduced-motion / skip update') &&
    frontendAuthority.includes('MainCityReducedMotionSkipButton'),
  'frontend authority must record the Stage 590 visible owner and button',
)

assert.ok(
  motionAuthority.includes('## 2026-06-13 Stage 590 Main-City Reduced-Motion / Skip UX') &&
    motionAuthority.includes('main_city_reduced_motion_skip_ux_v1'),
  'motion authority must record the Stage 590 reduced-motion packet',
)

assert.ok(
  aiAuthority.includes('Stage 590 AI switch visual boundary'),
  'AI authority must keep Stage 590 scoped to visual acceptance rather than AI recovery implementation',
)

console.log('[godot_main_city_visual_next_contract] all checks passed')
