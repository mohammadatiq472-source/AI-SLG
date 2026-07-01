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
const motionAuthority = read('docs/PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md')
const frontendAuthority = read('docs/PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md')
const productIndex = read('docs/PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md')
const currentHandoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
const hubOverlay = read('godot-client/scripts/ui/main_city_hub_overlay.gd')

const summarySource = functionSource(hubOverlay, 'func get_context_summary() -> Dictionary:')
const buildViewSource = functionSource(hubOverlay, 'func _build_view() -> void:')
const buildGatewaySource = functionSource(hubOverlay, 'func _build_city_space_gateway() -> Control:')
const transitionSource = functionSource(hubOverlay, 'func _play_city_space_stage_transition(city_model: TextureRect) -> void:')

assert.ok(
  packageJson.includes('"test:godot:main-city-spatial-entry-motion-contract"'),
  'package.json must expose the main-city spatial entry motion contract entry',
)

assert.ok(
  motionAuthority.includes('## 2026-06-13 Main-City Spatial Entry Motion Static Contract') &&
    motionAuthority.includes('main_city_spatial_entry_motion_static_contract_v1'),
  'motion authority must record the main-city spatial entry motion static contract',
)

assert.ok(
  frontendAuthority.includes('Main-city spatial entry update') &&
    frontendAuthority.includes('MainCityHubOverlay') &&
    frontendAuthority.includes('code_chain, not screenshot-backed player UI acceptance'),
  'frontend authority must record the main-city spatial entry proof level and owner',
)

assert.ok(
  productIndex.includes('Stage 580 update: main-city spatial entry motion now has a static/source-level formal contract') &&
    productIndex.includes('npm.cmd run test:godot:main-city-spatial-entry-motion-contract'),
  'product authority index must route future agents to the Stage 580 main-city spatial entry contract',
)

assert.ok(
  currentHandoff.includes('Stage 580 - main-city spatial entry motion static contract') &&
    currentHandoff.includes('npm.cmd run test:godot:main-city-spatial-entry-motion-contract'),
  'CURRENT handoff must record Stage 580 main-city spatial entry formal gate',
)

for (const token of [
  'const WORLD_ASSET_ENTER_CAMERA_PUSH_TOKEN := "main_city_world_asset_enter_camera_push_v1"',
  'const WORLD_ASSET_CAMERA_EASE_TOKEN := "main_city_world_asset_camera_ease_v2"',
  'const ENTER_TRANSITION_MASK_TOKEN := "main_city_enter_transition_mask_v1"',
  'const ENTERED_SPACE_STAGE_LAYOUT_TOKEN := "main_city_entered_space_stage_layout_v2"',
  'const ENTERED_SPACE_GATEHOUSE_TRANSITION_TOKEN := "main_city_gatehouse_axis_mansion_transition_v1"',
  'const ENTERED_SPACE_MANSION_HIGHLIGHT_TOKEN := "main_city_mansion_highlight_focus_v1"',
  'const SPATIAL_ENTRY_MOTION_CONTRACT_ID := "main_city_spatial_entry_motion_static_contract_v1"',
  'const SPATIAL_ENTRY_MOTION_PROOF_LEVEL := "code_chain"',
  'const SPATIAL_ENTRY_MOTION_STATES := "world_anchor|camera_push|transition_mask|entered_city_space|return_map"',
]) {
  assert.ok(hubOverlay.includes(token), `main-city hub overlay must retain ${token}`)
}

for (const summaryFact of [
  '"mainCitySpatialEntryMotionContractId"',
  '"mainCitySpatialEntryMotionProofLevel"',
  '"mainCitySpatialEntryMotionStates"',
  '"mainCitySpatialEntryNoDirectPopup"',
  '"mainCitySpatialEntryRealButtonActionIds"',
  '"mainCitySpatialEntryPlayerLabels"',
  '"worldAssetEnterCameraPushToken"',
  '"worldAssetCameraEaseToken"',
  '"mainCityEnterTransitionMaskToken"',
  '"mainCityEnteredSpaceStageVisible"',
  '"mainCitySceneGatehouseLayerVisible"',
  '"mainCitySceneMansionHighlightVisible"',
]) {
  assert.ok(summarySource.includes(summaryFact), `hub visual-smoke summary must expose ${summaryFact}`)
}

assert.ok(
  buildViewSource.includes('button.name = "MainCityWorldEnterButton"') &&
    buildViewSource.includes('button.text = "进入主城"') &&
    buildViewSource.includes('button.set_meta("main_city_world_asset_entry_action_id", "main_city_world_enter")') &&
    buildViewSource.includes('button.pressed.connect(_on_world_enter_button_pressed)'),
  'world-anchor entry must keep a real Button, player-safe text, action metadata, and live press handler',
)

assert.ok(
  buildGatewaySource.includes('stage.name = "MainCityEnteredSpaceStage"') &&
    buildGatewaySource.includes('background.name = "MainCitySceneBackdrop"') &&
    buildGatewaySource.includes('_add_city_gatehouse_transition_layer(stage, compact)') &&
    buildGatewaySource.includes('stage_return_button.name = "MainCitySceneReturnMapButton"') &&
    buildGatewaySource.includes('stage_return_button.set_meta("main_city_scene_return_action_id", "main_city_scene_return_map")') &&
    buildGatewaySource.includes('entry_row.add_child(_make_scene_entry_button("部队编组", "troop"') &&
    buildGatewaySource.includes('entry_row.add_child(_make_scene_entry_button("建筑树", "building_tree"'),
  'entered city space must keep backdrop, gatehouse axis, real return button, and real spatial entry buttons',
)

assert.ok(
  transitionSource.includes('create_tween()') &&
    transitionSource.includes('Tween.TRANS_SINE') &&
    transitionSource.includes('tween.tween_property(city_model, "scale", Vector2.ONE, 0.24)') &&
    transitionSource.includes('tween.parallel().tween_property(city_model, "modulate"'),
  'city-space stage must keep a bounded source-level transition rather than an instant hard swap',
)

for (const forbiddenLeak of ['read model', 'authority', 'tier', 'contract id', 'backend', 'fixture', 'debug']) {
  assert.equal(
    buildViewSource.includes(`"${forbiddenLeak}"`) || buildGatewaySource.includes(`"${forbiddenLeak}"`),
    false,
    `main-city player-visible quoted copy must not expose ${forbiddenLeak}`,
  )
}

console.log('[godot_main_city_spatial_entry_motion_contract] all checks passed')
