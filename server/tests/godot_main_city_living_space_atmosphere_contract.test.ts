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

const worldOpenConfig = visualSmoke.slice(
  visualSmoke.indexOf('"world_open_main_city_hub": {'),
  visualSmoke.indexOf('"world_open_main_city_hub_jump_coordinate": {'),
)
const hubSummarySource = functionSource(hubOverlay, 'func get_context_summary() -> Dictionary:')
const gatewaySource = functionSource(hubOverlay, 'func _build_city_space_gateway() -> Control:')
const contextPanelSource = functionSource(hubOverlay, 'func _build_context_panel() -> void:')
const livingSource = functionSource(hubOverlay, 'func _add_city_living_space_atmosphere(stage: Control, compact: bool) -> void:')
const buildingSource = functionSource(hubOverlay, 'func _add_city_living_space_building_layer(stage: Control, compact: bool) -> void:')
const livingMotionSource = functionSource(hubOverlay, 'func _play_city_living_space_atmosphere(stage: Control) -> void:')

assert.ok(
  packageJson.includes('"test:godot:main-city-living-space-atmosphere-contract"'),
  'package.json must expose the Stage 605 main-city living-space contract',
)

for (const requiredFact of [
  'LIVING_SPACE_STAGE605_CONTRACT_ID := "main_city_living_space_atmosphere_stage605_v1"',
  'LIVING_SPACE_MARKET_TOKEN := "main_city_living_market_assets_v1"',
  'LIVING_SPACE_CROWD_TOKEN := "main_city_living_crowd_flow_v1"',
  'LIVING_SPACE_BUILDING_TOKEN := "main_city_living_building_hierarchy_v1"',
  'LIVING_SPACE_ECONOMY_TOKEN := "main_city_living_economy_feedback_cue_v1"',
  'MAIN_CITY_PRIMARY_ASSET_FILE := "maincity_facility_city_lord_mansion_v4.png"',
  'MAIN_CITY_PRIMARY_ASSET_BINDING_TOKEN := "player_main_city_primary_asset_binding_v1"',
]) {
  assert.ok(hubOverlay.includes(requiredFact), `MainCityHubOverlay must define ${requiredFact}`)
}

assert.ok(
  gatewaySource.includes('_add_city_living_space_atmosphere(stage, compact)') &&
    gatewaySource.includes('_add_city_living_space_building_layer(stage, compact)') &&
    gatewaySource.includes('_add_city_slg_camera_depth_layers(stage, compact)') &&
    gatewaySource.includes('_add_city_gatehouse_transition_layer(stage, compact)'),
  'living-space atmosphere must be part of the real main-city surface with the existing camera/depth layers',
)

for (const requiredNode of [
  'MainCityLivingMarketStallBand',
  'MainCityLivingCrowdFlow',
  'MainCityLivingWorkerSilhouette_',
  'MainCityLivingEconomyCueLabel',
]) {
  assert.ok(livingSource.includes(requiredNode), `Stage 605 living-space slice must create ${requiredNode}`)
}

for (const requiredBuildingNode of [
  'MainCityLivingBuildingFacadeBand',
  'MainCityLivingBuildingRow',
  'MainCityLivingBuildingFacade_',
]) {
  assert.ok(buildingSource.includes(requiredBuildingNode), `Stage 610 building layer must create ${requiredBuildingNode}`)
}

assert.ok(
  livingSource.includes('economy_label.text = "粮税入库"') &&
    hubSummarySource.includes('"mainCityLivingSpacePlayerCopy": "市井往来|粮税入库"'),
  'Stage 605 living-space player copy must stay short Chinese copy',
)

assert.ok(
  buildingSource.includes('building_band.name = "MainCityLivingBuildingFacadeBand"') &&
    buildingSource.includes('building_row.name = "MainCityLivingBuildingRow"') &&
    buildingSource.includes('facade_count := 5 if compact else 7') &&
    hubSummarySource.includes('"mainCityLivingSpaceBuildingToken"') &&
    hubSummarySource.includes('"mainCityLivingSpaceBuildingVisible"') &&
    hubSummarySource.includes('"mainCityLivingSpaceCommerceLayerCount"') &&
    hubSummarySource.includes('_count_visible_nodes_by_name_prefix(self, "MainCityLivingBuilding")'),
  'Stage 610 living-space building layer must be a real visible hierarchy field',
)

for (const requiredField of [
  '"mainCityLivingSpaceStage605ContractId"',
  '"mainCityLivingSpaceMarketToken"',
  '"mainCityLivingSpaceCrowdToken"',
  '"mainCityLivingSpaceEconomyToken"',
  '"mainCityLivingSpaceMarketVisible"',
  '"mainCityLivingSpaceCrowdVisible"',
  '"mainCityLivingSpaceWorkerVisible"',
  '"mainCityLivingSpaceEconomyCueVisible"',
  '"mainCityLivingSpacePlayerCopy"',
  '"mainCityLivingSpaceLayerCount"',
  '"mainCityLivingSpacePreservesRealButtons"',
  '"mainCityLivingSpaceBuildingForegroundBlocked"',
  '"mainCityLivingSpaceBuildingLayerZIndex"',
  '"mainCityLivingSpaceBuildingRowZIndex"',
  '"mainCityPlayerBoundPrimaryAssetToken"',
  '"mainCityPlayerBoundPrimaryAssetFile"',
  '"mainCityPlayerBoundPrimaryAssetNode"',
  '"mainCityPlayerBoundPrimaryAssetVisible"',
  '"mainCityPlayerBoundEntryDockAnchoredToPrimaryAsset"',
  '"mainCityPlayerBoundEntryDockPlacementMode"',
  '"mainCityPlayerBoundEntryDockNearPrimaryAsset"',
  '"hubSceneReturnButtonLessIntrusive"',
  '"hubSceneReturnButtonCornerChrome"',
  '"mainCityLivingSpaceBuildingForegroundBlocked"',
  '"mainCityLivingSpaceBuildingLayerZIndex"',
  '"mainCityLivingSpaceBuildingRowZIndex"',
  '"mainCityHubMobileViewport"',
  '"mainCityHubMobileOverlapFree"',
  '"mainCityHubMobileOverlapHitCount"',
  '"mainCityHubMobileOverlapPairs"',
]) {
  assert.ok(worldOpenConfig.includes(requiredField), `world_open_main_city_hub must require ${requiredField}`)
  assert.ok(hubSummarySource.includes(requiredField), `MainCityHubOverlay summary must expose ${requiredField}`)
}

assert.ok(
  gatewaySource.includes('var mobile := _is_main_city_mobile_viewport(viewport_size)') &&
    gatewaySource.includes('stage_title.offset_right = 224.0 if mobile else 360.0') &&
    gatewaySource.includes('center.offset_bottom = -96.0 if mobile else (-118.0 if compact else -140.0)') &&
    gatewaySource.includes('var city_model_size := Vector2(340.0, 226.0) if mobile') &&
    gatewaySource.includes('_make_facility_scene_texture(MAIN_CITY_PRIMARY_ASSET_FILE, city_model_size)') &&
    gatewaySource.includes('city_model.set_meta("main_city_primary_asset_binding_token", MAIN_CITY_PRIMARY_ASSET_BINDING_TOKEN)') &&
    gatewaySource.includes('stage_return_button.custom_minimum_size = Vector2(92.0, 36.0) if mobile else Vector2(100.0, 38.0)') &&
    gatewaySource.includes('stage_return_button.z_index = 22') &&
    gatewaySource.includes('_apply_scene_return_map_button_style(stage_return_button)') &&
    gatewaySource.includes('entry_row.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)') &&
    gatewaySource.includes('entry_row.offset_top = -104.0 if mobile else (-120.0 if compact else -138.0)') &&
    gatewaySource.includes('var entry_button_size := Vector2(164.0, 48.0) if mobile') &&
    gatewaySource.includes('center.z_index = 14') &&
    gatewaySource.includes('entry_row.z_index = 18'),
  'Stage 605 gateway must keep mobile layout tight while anchoring real entry buttons near the main-city asset.',
)

assert.ok(
  buildingSource.includes('var facade_count := 5 if compact else 7') &&
    buildingSource.includes('building_band.offset_top = -286.0 if compact else -318.0') &&
    buildingSource.includes('building_row.offset_top = -256.0 if compact else -288.0') &&
    buildingSource.includes('building_band.z_index = 1') &&
    buildingSource.includes('building_row.z_index = 2'),
  'Stage 610 building layer must stay behind the main-city asset instead of reading as foreground test slots.',
)

assert.ok(
  livingMotionSource.includes('if _reduced_motion_enabled:') &&
    livingMotionSource.includes('tween.parallel().tween_property') &&
    livingMotionSource.includes('MainCityLivingCrowdFlow') &&
    livingMotionSource.includes('MainCityLivingEconomyCueLabel'),
  'Stage 605 living-space atmosphere must have a bounded light motion and reduced-motion fallback',
)

assert.ok(
  buildingSource.includes('building_band.mouse_filter = Control.MOUSE_FILTER_IGNORE') &&
    buildingSource.includes('building_row.mouse_filter = Control.MOUSE_FILTER_IGNORE'),
  'Stage 610 building layer must stay decorative and non-interactive',
)

assert.ok(
  contextPanelSource.includes('close_button.custom_minimum_size = Vector2(94.0, 38.0)') &&
    contextPanelSource.includes('_apply_scene_return_map_button_style(close_button)'),
  'Stage 613/614 return-map chrome must keep a real button but reduce old-shell visual weight',
)

for (const forbiddenVisibleText of ['read model', 'authority', 'tier', 'contract id', 'fixture', 'backend', 'debug']) {
  assert.equal(
    hubOverlay.includes(`"${forbiddenVisibleText}"`),
    false,
    `MainCityHubOverlay quoted player-facing text must not expose ${forbiddenVisibleText}`,
  )
}

console.log('[godot_main_city_living_space_atmosphere_contract] all checks passed')
