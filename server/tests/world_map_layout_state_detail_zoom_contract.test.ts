import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { WorldMapLayoutLayerRequest } from '../../shared/contracts/game'
import { getWorldMapLayout } from '../src/application/world/WorldService'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const STATE_FILL_RATIO_2K_ACCEPTANCE_MIN = 0.62
const RECOMMENDED_GODOT_SCREENSHOT_STATE_IDS = [
  'bingzhou',
  'jiaozhou',
  'jingzhou',
  '南洋港',
  '东羌高原',
  '倭人诸国·九州',
]

function readUtf8(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

type WorldMapStateBoundsSummary = {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

type WorldMapStatePivotSummary = {
  x: number
  y: number
}

type WorldMapStateDetailCoverageRow = {
  stateId: string
  hasStateDetailTiles: boolean
  hasRoadNetwork: boolean
  hasStrategicNodes: boolean
  fallbackReason: string
  screenFillRatioAt2k: number
  stateFitZoomFor2k: number
  maxDetailZoom: number
  stateBoundsCells: WorldMapStateBoundsSummary
  stateBoundsPx: WorldMapStateBoundsSummary
  recommendedPivotCell: WorldMapStatePivotSummary
  recommendedPivotPx: WorldMapStatePivotSummary
  roadCount: number
  roadDensity: number
  nodeCount: number
  nodeDensity: number
  cityNodeCount: number
  gateNodeCount: number
  tileCount: number
  highResTrigger: string
}

type WorldMapStateDetailSamplePayload = {
  stateId: string
  fallbackReason: string
  screenFillRatioAt2k: number
  stateFitZoomFor2k: number
  maxDetailZoom: number
  tileCount: number
  roadCount: number
  cityNodeCount: number
  gateNodeCount: number
  highResTrigger: string
}

type WorldMapStateDetailBackendPayloadProof = {
  stateId: string
  stateNameZh: string
  stateBoundsCells: WorldMapStateBoundsSummary
  stateBoundsPx: WorldMapStateBoundsSummary
  cellCount: number
  tileCount: number
  tileLevelCount: number
  visibleTileCount: number
  loadedTileCount: number
  retainedCacheTileCount: number
  stateFitZoomFor2k: number
  maxDetailZoom: number
  screenFillRatioAt2k: number
  detailSourceMode: string
  tileSourceMode: string
  runtimeVisualStatus: string
  cityNodeCount: number
  gateNodeCount: number
  roadCount: number
  strategicNodeCount: number
  maskOnly: boolean
  highResAssetRequired: boolean
  fallbackReason: string
  fallbackMode: string
  cachePolicy: string
  hitTestPolicy: string
  rejectionBoundary: string
}

type WorldMapStateDetailAssetReadinessMatrixRow = {
  stateId: string
  readinessClass: 'seed_complete_requires_authoritative_assets' | 'mask_only_requires_authoritative_data'
  backendPayloadExists: boolean
  finalVisualAssetExists: boolean
  stateBoundsCells: WorldMapStateBoundsSummary
  stateBoundsPx: WorldMapStateBoundsSummary
  stateFitZoomFor2k: number
  maxDetailZoom: number
  screenFillRatioAt2k: number
  counts: {
    tileCount: number
    roadCount: number
    cityNodeCount: number
    gateNodeCount: number
    strategicNodeCount: number
  }
  fallbackReason: string
  deterministicFallbackAvailable: boolean
  maskOnly: boolean
  highResAssetRequired: boolean
  requiredAssetDataPacks: string[]
  nextDispatchReason: string
}

type WorldMapStateDetailScreenshotCase = {
  stateId: string
  riskCategories: string[]
  stateBoundsCells: WorldMapStateBoundsSummary
  stateBoundsPx: WorldMapStateBoundsSummary
  recommendedPivotCell: WorldMapStatePivotSummary
  recommendedPivotPx: WorldMapStatePivotSummary
  recommendedZoom: {
    stateFitZoomFor2k: number
    maxDetailZoom: number
    screenshotZoom: number
  }
  expectedStateFillRatio2kMin: number
  expectedScreenFillRatioAt2k: number
  counts: {
    tileCount: number
    roadCount: number
    strategicNodeCount: number
    cityNodeCount: number
    gateNodeCount: number
  }
  fallbackReason: string
  maskOnly: boolean
  highResAssetRequired: boolean
  rejectionBoundary: string
}

function readStateIdsFromAdminFocusMasks(seedFile: string): string[] {
  const seedJson = JSON.parse(readUtf8(seedFile))
  const masks = Array.isArray(seedJson?.masks) ? seedJson.masks : []
  const stateIds = new Set<string>()

  for (const mask of masks) {
    if ((mask?.scope ?? '').trim() !== 'state') {
      continue
    }

    const stateId = typeof mask?.state_id === 'string' ? mask.state_id.trim() : ''
    if (stateId.length > 0) {
      stateIds.add(stateId)
    }
  }

  return Array.from(stateIds).sort()
}

function rangeFromValues(values: number[]) {
  if (values.length === 0) {
    return { min: 0, max: 0 }
  }
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  }
}

function toFiniteNumber(value: unknown, fallback = 0) {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

function boundsSummaryFromContract(bounds: {
  min_x?: number
  min_y?: number
  max_x?: number
  max_y?: number
}): WorldMapStateBoundsSummary {
  const minX = Math.floor(toFiniteNumber(bounds.min_x, 0))
  const minY = Math.floor(toFiniteNumber(bounds.min_y, 0))
  const maxX = Math.floor(toFiniteNumber(bounds.max_x, minX))
  const maxY = Math.floor(toFiniteNumber(bounds.max_y, minY))
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX + 1),
    height: Math.max(1, maxY - minY + 1),
  }
}

function pivotFromBounds(bounds: WorldMapStateBoundsSummary): WorldMapStatePivotSummary {
  return {
    x: Math.round((bounds.minX + bounds.maxX) / 2),
    y: Math.round((bounds.minY + bounds.maxY) / 2),
  }
}

function main() {
  const appTs = readUtf8('server/src/app.ts')
  const worldContract = readUtf8('shared/contracts/game/world.ts')
  const builder = readUtf8('server/src/application/world/layout/stateDetailLayerBuilder.ts')
  const validationDoc = readUtf8('docs/parallel-validation/2026-06-19-world-map-state-detail-zoom-validation.md')
  const mapGridGd = readUtf8('godot-client/scripts/map/map_grid.gd')
  const mainGd = readUtf8('godot-client/scripts/app/main.gd')
  const visualSmokeRunner = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')

  assert.match(worldContract, /export type WorldMapStateDetailTilesLayer = \{/, 'world contract should define state detail tiles layer')
  assert.match(worldContract, /export type WorldMapStateRoadNetworkLayer = \{/, 'world contract should define state road network layer')
  assert.match(worldContract, /export type WorldMapStateStrategicNodesLayer = \{/, 'world contract should define state strategic nodes layer')
  assert.match(worldContract, /state_detail_tiles\?: WorldMapStateDetailTilesLayer/, 'world layout response should expose optional state detail tiles payload')
  assert.match(worldContract, /state_road_network\?: WorldMapStateRoadNetworkLayer/, 'world layout response should expose optional state road network payload')
  assert.match(worldContract, /state_strategic_nodes\?: WorldMapStateStrategicNodesLayer/, 'world layout response should expose optional state strategic nodes payload')

  assert.match(builder, /EAST_HAN_STATE_DETAIL_TILES_LAYER = 'state_detail_tiles'/, 'builder should declare state detail tile layer id')
  assert.match(builder, /buildStateDetailTilesSkeleton/, 'builder should expose state detail tiles skeleton builder')
  assert.match(builder, /buildStateRoadNetworkSkeleton/, 'builder should expose state road network skeleton builder')
  assert.match(builder, /buildStateStrategicNodesSkeleton/, 'builder should expose state strategic nodes skeleton builder')
  assert.match(builder, /buildStateDetailTilesRuntime/, 'builder should expose runtime state detail tiles builder')
  assert.match(builder, /buildStateRoadNetworkRuntime/, 'builder should expose runtime state road network builder')
  assert.match(builder, /buildStateStrategicNodesRuntime/, 'builder should expose runtime strategic nodes builder')

  assert.match(appTs, /pathname === '\/api\/world\/map-layout'/, 'app route should expose map-layout endpoint')
  assert.match(appTs, /stateDetailStateId = requestUrl\.searchParams\.get\('stateDetailStateId'\)/, 'app route should parse stateDetailStateId query param')
  assert.match(appTs, /stateDetailStateId,/, 'app route should pass stateDetailStateId into world map layout options')

  assert.match(validationDoc, /state_detail_tiles/, 'validation doc should describe state_detail_tiles field standard')
  assert.match(validationDoc, /state_road_network/, 'validation doc should describe state_road_network field standard')
  assert.match(validationDoc, /state_strategic_nodes/, 'validation doc should describe state_strategic_nodes field standard')
  assert.match(validationDoc, /57/, 'validation doc should mention 57-state coverage planning')
  assert.match(validationDoc, /runtime wiring/, 'validation doc should mention runtime wiring status')
  assert.match(validationDoc, /nextGodotScreenshotStateCases/, 'validation doc should name phase-2 screenshot case payload')
  assert.match(validationDoc, /expectedStateFillRatio2kMin = 0\.62/, 'validation doc should name the static 2K fill lower bound')
  assert.match(validationDoc, /recommendedPivotCell/, 'validation doc should name state-detail pivot fields')
  assert.match(validationDoc, /stateDetailAssetReadinessMatrix/, 'validation doc should name the 57-state asset readiness matrix')
  assert.match(validationDoc, /stateHighResTilePyramidReadiness/, 'validation doc should name the 57-state high-res tile pyramid readiness table')
  assert.match(validationDoc, /per_state_high_res_tile_pyramid/, 'validation doc should name the per-state high-res tile pyramid package')
  assert.match(validationDoc, /finalVisualAssetExists = 0/, 'validation doc should preserve the no-final-visual-asset boundary')
  assert.match(mapGridGd, /"tianxiaYutuSelectedStateId": _tianxia_yutu_selected_state_id\(\)/, 'map grid should expose selected Tianxia state id in debug summary')
  assert.match(mapGridGd, /"stateFillRatio2k": _last_tianxia_yutu_state_fill_ratio_2k/, 'map grid should expose 2K state fill ratio in debug summary')
  assert.match(mapGridGd, /func _compute_tianxia_yutu_state_fill_ratio_2k\(\)/, 'map grid should compute Tianxia 2K state fill ratio')
  assert.match(mainGd, /"stateFillRatio2k": "map_grid\._compute_tianxia_yutu_state_fill_ratio_2k"/, 'main smoke summary should document stateFillRatio2k producer source')
  const singleStateDetailActionRegistered =
    visualSmokeRunner.includes('"world_tianxia_yutu_state_detail_zoom_qa"') &&
    mainGd.includes('"world_tianxia_yutu_state_detail_zoom_qa"')
  const allStateDetailActionRegistered =
    visualSmokeRunner.includes('"world_tianxia_yutu_all_state_detail_zoom_coverage"') &&
    mainGd.includes('"world_tianxia_yutu_all_state_detail_zoom_coverage"')
  assert.ok(singleStateDetailActionRegistered, 'single-state Godot state-detail screenshot action should be registered in runner and main.gd')
  assert.ok(allStateDetailActionRegistered, 'all-state Godot state-detail screenshot action should be registered in runner and main.gd')
  assert.match(visualSmokeRunner, /parser\.add_argument\("--state-ids"/, 'visual smoke runner should expose --state-ids')
  assert.match(visualSmokeRunner, /parser\.add_argument\(\s*"--state-case-set"/, 'visual smoke runner should expose ASCII-safe --state-case-set')
  assert.match(visualSmokeRunner, /tianxia_recommended_six/, 'visual smoke runner should provide tianxia_recommended_six preset')
  assert.match(visualSmokeRunner, /six_state_recommended_screenshot/, 'visual smoke runner should label tianxia_recommended_six as six-state recommended scope')
  assert.match(visualSmokeRunner, /stateCaseSetScope/, 'visual smoke runner summary should expose stateCaseSetScope')
  assert.match(visualSmokeRunner, /recommendedStateCaseCount/, 'visual smoke runner summary should expose recommendedStateCaseCount')
  assert.match(visualSmokeRunner, /notAllStateCoverage/, 'visual smoke runner summary should expose notAllStateCoverage')
  assert.match(visualSmokeRunner, /allStateVisualProof/, 'visual smoke runner summary should expose allStateVisualProof')
  assert.match(visualSmokeRunner, /requiresSeparate57StateVisualProof/, 'visual smoke runner summary should expose separate 57-state proof requirement')
  for (const stateId of RECOMMENDED_GODOT_SCREENSHOT_STATE_IDS) {
    assert.match(visualSmokeRunner, new RegExp(stateId), `visual smoke runner preset should include ${stateId}`)
  }
  assert.match(visualSmokeRunner, /SLG_MAINLINE_VISUAL_SMOKE_STATE_IDS/, 'visual smoke runner should pass state ids to Godot')
  assert.match(mainGd, /SLG_MAINLINE_VISUAL_SMOKE_STATE_IDS/, 'main.gd should consume state ids for state-detail screenshots')
  assert.match(validationDoc, /--state-case-set tianxia_recommended_six/, 'validation doc should recommend ASCII-safe six-state heavy command')
  assert.match(validationDoc, /six-state screenshot is not 57-state visual proof/, 'validation doc should keep six-state versus 57-state visual proof boundary explicit')
  assert.match(validationDoc, /stateCaseSetScope/, 'validation doc should name stateCaseSetScope')
  assert.match(validationDoc, /recommendedStateCaseCount/, 'validation doc should name recommendedStateCaseCount')
  assert.match(validationDoc, /notAllStateCoverage/, 'validation doc should name notAllStateCoverage')
  assert.match(validationDoc, /已注册但未重型验证/, 'validation doc should mark state-detail screenshot runner wiring as registered but not heavy-validated')
  assert.doesNotMatch(validationDoc, /state_detail_zoom_qa runner wiring pending/, 'validation doc should not leave state-detail runner wiring as pending after registration')
  assert.doesNotMatch(validationDoc, /--state-ids is not registered/, 'validation doc should not leave --state-ids as unregistered after registration')

  const allStateIds = readStateIdsFromAdminFocusMasks(
    'experiments/east_asia_map_pipeline/generated/east_han_tianxia_yutu_admin_focus_masks_v0_1/east_han_tianxia_yutu_admin_focus_masks_v0_1.json',
  )
  assert.equal(allStateIds.length, 57, 'admin focus masks should expose 57 unique state ids for coverage matrix')

  const includeLayers: WorldMapLayoutLayerRequest[] = [
    'state_detail_tiles',
    'state_road_network',
    'state_strategic_nodes',
  ]
  const rows: WorldMapStateDetailCoverageRow[] = []
  const missingStateIds: string[] = []
  const emptyRoadStateIds: string[] = []
  const emptyNodeStateIds: string[] = []
  const fallbackReasonCounts = new Map<string, number>()
  const perStateHighResTriggerCounts = new Map<string, number>()
  let backendEntryPayloadProof: WorldMapStateDetailBackendPayloadProof | null = null

  for (const stateId of allStateIds) {
    const payload = getWorldMapLayout({
      scope: 'viewport',
      centerX: 4387,
      centerY: 2482,
      layer: 'layered',
      worldId: 'unified_aoi_v0_6_formal_real_map_data_1km',
      coordinateSpace: 'real_map_data_1km.cell_1km',
      visibleCells: { width: 512, height: 320 },
      visibleSizeCells: { width: 512, height: 320 },
      preloadMarginCells: 64,
      chunkSizeCells: { width: 64, height: 64 },
      includeLayers,
      stateDetailStateId: stateId,
    })

    const hasStateDetailTiles = Boolean(payload.state_detail_tiles)
    const hasRoadNetwork = Boolean(payload.state_road_network)
    const hasStrategicNodes = Boolean(payload.state_strategic_nodes)

    if (!hasStateDetailTiles || !hasRoadNetwork || !hasStrategicNodes) {
      missingStateIds.push(stateId)
    }

    if (!hasStateDetailTiles) {
      rows.push({
        stateId,
        hasStateDetailTiles,
        hasRoadNetwork,
        hasStrategicNodes,
        fallbackReason: 'missing_state_detail_tiles',
        screenFillRatioAt2k: 0,
        stateFitZoomFor2k: 0,
        maxDetailZoom: 0,
        stateBoundsCells: boundsSummaryFromContract({}),
        stateBoundsPx: boundsSummaryFromContract({}),
        recommendedPivotCell: { x: 0, y: 0 },
        recommendedPivotPx: { x: 0, y: 0 },
        roadCount: 0,
        roadDensity: 0,
        nodeCount: 0,
        nodeDensity: 0,
        cityNodeCount: 0,
        gateNodeCount: 0,
        tileCount: 0,
        highResTrigger: 'missing_layer',
      })
      continue
    }

    const stateDetailTiles = payload.state_detail_tiles
    const roadLayer = payload.state_road_network
    const strategicNodeLayer = payload.state_strategic_nodes

    assert.ok(stateDetailTiles, 'runtime layout should include state_detail_tiles when explicitly requested')
    assert.equal(stateDetailTiles.state_id, stateId, 'state detail tiles should resolve requested state')
    assert.equal(stateDetailTiles.schema_version, 'east_han_state_detail_tiles_layer_v0_1', 'state detail tiles schema')
    assert.equal(stateDetailTiles.source_contract_status, 'runtime_ready', 'state detail tiles should be runtime ready')
    assert.ok(stateDetailTiles.tile_levels.length >= 1, 'state detail tiles should expose at least one tile level')
    assert.ok(stateDetailTiles.state_fit_zoom_for_2k > 0, 'state detail tiles should expose 2K fit zoom')
    assert.ok(stateDetailTiles.max_detail_zoom >= stateDetailTiles.state_fit_zoom_for_2k, 'max detail zoom should not be below 2K fit zoom')
    assert.equal(stateDetailTiles.quality_summary.overview_source_artifact_id, 'east_han_tianxia_yutu_runtime_tile_manifest_v0_1', 'state detail tiles should disclose current 8K overview source artifact')
    assert.match(stateDetailTiles.quality_summary.overview_source_image_path, /high_res_map_candidate_v0_6_composite\.png$/, 'state detail tiles should disclose current 8K overview source image')
    assert.match(stateDetailTiles.quality_summary.state_mask_path, /\.png$/, 'state detail tiles should disclose state mask path')
    assert.equal(stateDetailTiles.quality_summary.detail_source_mode, 'overview_8k_plus_state_mask_seed', 'state detail tiles should disclose current detail source mode')
    assert.equal(stateDetailTiles.quality_summary.tile_source_mode, 'single_mask_seed', 'state detail tiles should admit current single-tile seed mode')
    assert.equal(stateDetailTiles.quality_summary.screen_fill_ratio_source, 'state_bounds_px_vs_2048x1152', 'state detail tiles should disclose screen fill ratio source')
    assert.ok(stateDetailTiles.quality_summary.screen_fill_ratio_at_2k >= 0, 'state detail tiles should report screen fill ratio estimate at 2k')
    assert.equal(stateDetailTiles.quality_summary.runtime_visual_status, 'seed_only_not_final_8k_product_visual', 'state detail tiles should declare current runtime visual boundary')
    assert.ok(stateDetailTiles.tile_budget.max_visible_tiles >= stateDetailTiles.tile_budget.current_visible_tiles, 'tile budget should bound current visible tiles')
    assert.ok(Array.isArray(stateDetailTiles.tiles), 'state detail tiles should expose serializable tile refs array')

    assert.equal(roadLayer?.schema_version, 'east_han_state_road_network_layer_v0_1', 'state road network schema')
    assert.equal(roadLayer?.source_contract_status, 'runtime_ready', 'state road network should be runtime ready')
    assert.ok(Array.isArray(roadLayer?.roads), 'state road network should expose serializable road array')
    assert.equal(roadLayer!.density_summary.road_count, roadLayer!.roads.length, 'road density summary should match serialized road count')
    assert.equal(roadLayer!.density_summary.seeded_from_existing_jump_targets, true, 'road density summary should admit seeded source')

    assert.equal(strategicNodeLayer?.schema_version, 'east_han_state_strategic_nodes_layer_v0_1', 'state strategic nodes schema')
    assert.equal(strategicNodeLayer?.state_id, stateId, 'state strategic nodes should resolve requested state')
    assert.equal(strategicNodeLayer?.source_contract_status, 'runtime_ready', 'state strategic nodes should be runtime ready')
    assert.ok(Array.isArray(strategicNodeLayer?.nodes), 'state strategic nodes should expose serializable node array')
    assert.equal(strategicNodeLayer!.density_summary.node_count, strategicNodeLayer!.nodes.length, 'node density summary should match node count')

    const fallbackReason = stateDetailTiles.fallback_policy.fallback_reason || 'missing_fallback_reason'
    const highResTrigger = stateDetailTiles.quality_summary.per_state_high_res_trigger || 'missing_per_state_high_res_trigger'
    const stateFitZoomFor2k = toFiniteNumber(stateDetailTiles.state_fit_zoom_for_2k, 0)
    const maxDetailZoom = toFiniteNumber(stateDetailTiles.max_detail_zoom, 0)
    const stateBoundsCells = boundsSummaryFromContract(stateDetailTiles.state_bounds_cells)
    const stateBoundsPx = boundsSummaryFromContract(stateDetailTiles.state_bounds_px)
    const recommendedPivotCell = pivotFromBounds(stateBoundsCells)
    const recommendedPivotPx = pivotFromBounds(stateBoundsPx)
    const areaPx = stateBoundsPx.width * stateBoundsPx.height
    const roadCount = toFiniteNumber(roadLayer?.density_summary.road_count, 0)
    const nodeCount = toFiniteNumber(strategicNodeLayer?.density_summary.node_count, 0)
    const cityNodeCount = strategicNodeLayer!.nodes.filter((node) => node.node_type === 'city').length
    const gateNodeCount = strategicNodeLayer!.nodes.filter((node) => node.node_type === 'gate').length
    const roadDensity = roadCount / areaPx
    const nodeDensity = nodeCount / areaPx
    const screenFillRatioAt2k = toFiniteNumber(stateDetailTiles.quality_summary.screen_fill_ratio_at_2k, 0)
    const maskOnly = fallbackReason === 'state_mask_only_without_seed_roads'
    const highResAssetRequired =
      stateDetailTiles.quality_summary.per_state_high_res_trigger ===
      'required_when_single_mask_seed_cannot_hold_city_road_node_density_or_2k_readability'

    if (stateId === 'bingzhou') {
      backendEntryPayloadProof = {
        stateId,
        stateNameZh: stateDetailTiles.state_name_zh,
        stateBoundsCells,
        stateBoundsPx,
        cellCount: stateBoundsCells.width * stateBoundsCells.height,
        tileCount: stateDetailTiles.tiles.length,
        tileLevelCount: stateDetailTiles.tile_levels.length,
        visibleTileCount: stateDetailTiles.visible_tile_ids.length,
        loadedTileCount: stateDetailTiles.loaded_tile_ids.length,
        retainedCacheTileCount: stateDetailTiles.retained_cache_tile_ids.length,
        stateFitZoomFor2k,
        maxDetailZoom,
        screenFillRatioAt2k,
        detailSourceMode: stateDetailTiles.quality_summary.detail_source_mode,
        tileSourceMode: stateDetailTiles.quality_summary.tile_source_mode,
        runtimeVisualStatus: stateDetailTiles.quality_summary.runtime_visual_status,
        cityNodeCount,
        gateNodeCount,
        roadCount,
        strategicNodeCount: nodeCount,
        maskOnly,
        highResAssetRequired,
        fallbackReason,
        fallbackMode: stateDetailTiles.fallback_policy.fallback_mode,
        cachePolicy: stateDetailTiles.fallback_policy.cache_policy,
        hitTestPolicy: stateDetailTiles.fallback_policy.hit_test_policy,
        rejectionBoundary: highResAssetRequired
          ? 'do_not_claim_final_8k_state_visual_until_per_state_high_res_assets_or_authoritative_detail_data_exist'
          : 'state_detail_payload_available_but_visual_acceptance_still_requires_2k_godot_screenshot',
      }
    }

    rows.push({
      stateId,
      hasStateDetailTiles,
      hasRoadNetwork: Boolean(roadLayer),
      hasStrategicNodes: Boolean(strategicNodeLayer),
      fallbackReason,
      screenFillRatioAt2k,
      stateFitZoomFor2k,
      maxDetailZoom,
      stateBoundsCells,
      stateBoundsPx,
      recommendedPivotCell,
      recommendedPivotPx,
      roadCount,
      roadDensity,
      nodeCount,
      nodeDensity,
      cityNodeCount,
      gateNodeCount,
      tileCount: stateDetailTiles.tiles.length,
      highResTrigger,
    })

    fallbackReasonCounts.set(fallbackReason, (fallbackReasonCounts.get(fallbackReason) ?? 0) + 1)
    perStateHighResTriggerCounts.set(highResTrigger, (perStateHighResTriggerCounts.get(highResTrigger) ?? 0) + 1)

    if (roadCount <= 0) {
      emptyRoadStateIds.push(stateId)
    }
    if (nodeCount <= 0) {
      emptyNodeStateIds.push(stateId)
    }
  }

  const payloadReadyCount = rows.filter((row) => row.hasStateDetailTiles).length
  const roadReadyCount = rows.filter((row) => row.hasRoadNetwork).length
  const nodeReadyCount = rows.filter((row) => row.hasStrategicNodes).length
  const readyRows = rows.filter((row) => row.hasStateDetailTiles)
  const statesWithRoadSeed = rows.filter((row) => row.roadCount > 0).map((row) => row.stateId)
  const statesWithCityNodes = rows.filter((row) => row.cityNodeCount > 0).map((row) => row.stateId)
  const statesWithGateNodes = rows.filter((row) => row.gateNodeCount > 0).map((row) => row.stateId)
  const statesWithRoadCityGateSeed = rows
    .filter((row) => row.roadCount > 0 && row.cityNodeCount > 0 && row.gateNodeCount > 0)
    .map((row) => row.stateId)
  const maskOnlyStateIds = rows
    .filter((row) => row.fallbackReason === 'state_mask_only_without_seed_roads')
    .map((row) => row.stateId)
  const deterministicFallbackStateIds = rows
    .filter((row) => row.fallbackReason === 'state_mask_only_without_seed_roads' && row.tileCount > 0 && row.screenFillRatioAt2k > 0)
    .map((row) => row.stateId)
  const highResAssetRequiredStateIds = rows
    .filter((row) => row.highResTrigger === 'required_when_single_mask_seed_cannot_hold_city_road_node_density_or_2k_readability')
    .map((row) => row.stateId)

  const screenFillRatioRange = rangeFromValues(readyRows.map((row) => row.screenFillRatioAt2k))
  const roadDensityRange = rangeFromValues(readyRows.map((row) => row.roadDensity))
  const nodeDensityRange = rangeFromValues(readyRows.map((row) => row.nodeDensity))
  const sortedBySmallestFill = [...readyRows].sort((left, right) => left.screenFillRatioAt2k - right.screenFillRatioAt2k)
  const screenshotSeedIds = Array.from(new Set([
    ...statesWithRoadCityGateSeed.slice(0, 3),
    ...sortedBySmallestFill.filter((row) => maskOnlyStateIds.includes(row.stateId)).slice(0, 3).map((row) => row.stateId),
    ...sortedBySmallestFill.slice(0, 2).map((row) => row.stateId),
  ])).slice(0, 8)
  const screenshotRows = RECOMMENDED_GODOT_SCREENSHOT_STATE_IDS.map((stateId) => rows.find((row) => row.stateId === stateId))
  const missingScreenshotStateIds = RECOMMENDED_GODOT_SCREENSHOT_STATE_IDS.filter((_, index) => !screenshotRows[index])
  const screenshotCaseFromRow = (row: WorldMapStateDetailCoverageRow): WorldMapStateDetailScreenshotCase => {
    const maskOnly = row.fallbackReason === 'state_mask_only_without_seed_roads'
    const highResAssetRequired =
      row.highResTrigger === 'required_when_single_mask_seed_cannot_hold_city_road_node_density_or_2k_readability'
    const riskCategories = [
      ...(row.roadCount > 0 && row.cityNodeCount > 0 && row.gateNodeCount > 0 ? ['seed_complete'] : []),
      ...(maskOnly ? ['mask_only_deterministic_fallback'] : []),
      ...(row.screenFillRatioAt2k === screenFillRatioRange.min ? ['lowest_state_fill_ratio_2k'] : []),
      ...(highResAssetRequired ? ['high_res_asset_required'] : []),
    ]

    return {
      stateId: row.stateId,
      riskCategories,
      stateBoundsCells: row.stateBoundsCells,
      stateBoundsPx: row.stateBoundsPx,
      recommendedPivotCell: row.recommendedPivotCell,
      recommendedPivotPx: row.recommendedPivotPx,
      recommendedZoom: {
        stateFitZoomFor2k: row.stateFitZoomFor2k,
        maxDetailZoom: row.maxDetailZoom,
        screenshotZoom: row.stateFitZoomFor2k,
      },
      expectedStateFillRatio2kMin: STATE_FILL_RATIO_2K_ACCEPTANCE_MIN,
      expectedScreenFillRatioAt2k: row.screenFillRatioAt2k,
      counts: {
        tileCount: row.tileCount,
        roadCount: row.roadCount,
        strategicNodeCount: row.nodeCount,
        cityNodeCount: row.cityNodeCount,
        gateNodeCount: row.gateNodeCount,
      },
      fallbackReason: row.fallbackReason,
      maskOnly,
      highResAssetRequired,
      rejectionBoundary: highResAssetRequired
        ? 'do_not_claim_final_8k_state_visual_until_per_state_high_res_assets_or_authoritative_detail_data_exist'
        : 'state_detail_payload_available_but_visual_acceptance_still_requires_2k_godot_screenshot',
    }
  }
  const screenshotCases = screenshotRows
    .filter((row): row is WorldMapStateDetailCoverageRow => Boolean(row))
    .map(screenshotCaseFromRow)
  const samplePayloadFromRow = (row: WorldMapStateDetailCoverageRow | undefined): WorldMapStateDetailSamplePayload | null =>
    row
      ? {
          stateId: row.stateId,
          fallbackReason: row.fallbackReason,
          screenFillRatioAt2k: row.screenFillRatioAt2k,
          stateFitZoomFor2k: row.stateFitZoomFor2k,
          maxDetailZoom: row.maxDetailZoom,
          tileCount: row.tileCount,
          roadCount: row.roadCount,
          cityNodeCount: row.cityNodeCount,
          gateNodeCount: row.gateNodeCount,
          highResTrigger: row.highResTrigger,
        }
      : null

  const assetDataDispatchPackages = [
    {
      packageId: 'per_state_high_res_tile_pyramid',
      ownerHint: 'map_asset_pipeline',
      requiredStateCount: 57,
      purpose: 'replace single_mask_seed with readable per-state high-resolution detail tiles',
    },
    {
      packageId: 'authoritative_city_gate_catalog',
      ownerHint: 'world_geography_data',
      requiredStateCount: 57,
      purpose: 'provide product-authoritative city and gate entries instead of seed-only or empty nodes',
    },
    {
      packageId: 'authoritative_road_route_network',
      ownerHint: 'world_route_data',
      requiredStateCount: 57,
      purpose: 'provide state-level road and route polylines suitable for deep zoom and hit-test',
    },
    {
      packageId: 'authoritative_strategic_node_hotspot_catalog',
      ownerHint: 'world_strategy_data',
      requiredStateCount: 57,
      purpose: 'provide state-level strategic nodes, chokepoints, passes, docks, and hotspots',
    },
    {
      packageId: 'godot_2k_state_detail_visual_evidence',
      ownerHint: 'main_window_heavy_validation',
      requiredStateCount: 57,
      purpose: 'prove readable state detail visuals separately from backend payload existence',
    },
  ]

  const stateDetailAssetReadinessMatrix: WorldMapStateDetailAssetReadinessMatrixRow[] = rows.map((row) => {
    const seedComplete = row.roadCount > 0 && row.cityNodeCount > 0 && row.gateNodeCount > 0
    const maskOnly = row.fallbackReason === 'state_mask_only_without_seed_roads'
    const highResAssetRequired =
      row.highResTrigger === 'required_when_single_mask_seed_cannot_hold_city_road_node_density_or_2k_readability'

    return {
      stateId: row.stateId,
      readinessClass: seedComplete
        ? 'seed_complete_requires_authoritative_assets'
        : 'mask_only_requires_authoritative_data',
      backendPayloadExists: row.hasStateDetailTiles && row.hasRoadNetwork && row.hasStrategicNodes,
      finalVisualAssetExists: false,
      stateBoundsCells: row.stateBoundsCells,
      stateBoundsPx: row.stateBoundsPx,
      stateFitZoomFor2k: row.stateFitZoomFor2k,
      maxDetailZoom: row.maxDetailZoom,
      screenFillRatioAt2k: row.screenFillRatioAt2k,
      counts: {
        tileCount: row.tileCount,
        roadCount: row.roadCount,
        cityNodeCount: row.cityNodeCount,
        gateNodeCount: row.gateNodeCount,
        strategicNodeCount: row.nodeCount,
      },
      fallbackReason: row.fallbackReason,
      deterministicFallbackAvailable: maskOnly && row.tileCount > 0 && row.screenFillRatioAt2k > 0,
      maskOnly,
      highResAssetRequired,
      requiredAssetDataPacks: assetDataDispatchPackages.map((entry) => entry.packageId),
      nextDispatchReason: seedComplete
        ? 'seed_data_exists_but_must_be_promoted_to_authoritative_detail_assets_before_visual_green'
        : 'state_mask_bounds_zoom_exist_but_city_road_gate_strategic_data_are_missing',
    }
  })
  const assetReadinessCounts = {
    backendPayloadExists: stateDetailAssetReadinessMatrix.filter((row) => row.backendPayloadExists).length,
    seedCompleteRequiresAuthoritativeAssets: stateDetailAssetReadinessMatrix.filter(
      (row) => row.readinessClass === 'seed_complete_requires_authoritative_assets',
    ).length,
    maskOnlyRequiresAuthoritativeData: stateDetailAssetReadinessMatrix.filter(
      (row) => row.readinessClass === 'mask_only_requires_authoritative_data',
    ).length,
    highResAssetRequired: stateDetailAssetReadinessMatrix.filter((row) => row.highResAssetRequired).length,
    finalVisualAssetExists: stateDetailAssetReadinessMatrix.filter((row) => row.finalVisualAssetExists).length,
  }

  assert.ok(payloadReadyCount > 0, '57-state matrix should get at least one runtime state_detail_tiles payload')
  assert.ok(roadReadyCount > 0, '57-state matrix should get at least one runtime road network payload')
  assert.ok(nodeReadyCount > 0, '57-state matrix should get at least one runtime strategic nodes payload')
  assert.ok(backendEntryPayloadProof, 'backend entry payload proof should resolve a concrete seed state')
  assert.equal(backendEntryPayloadProof?.stateId, 'bingzhou', 'backend entry payload proof should use an ASCII state id')
  assert.ok((backendEntryPayloadProof?.stateNameZh ?? '').length > 0, 'backend payload proof should expose state name')
  assert.ok((backendEntryPayloadProof?.cellCount ?? 0) > 0, 'backend payload proof should expose state cell count')
  assert.ok((backendEntryPayloadProof?.tileCount ?? 0) > 0, 'backend payload proof should expose tile count')
  assert.ok((backendEntryPayloadProof?.cityNodeCount ?? 0) > 0, 'backend payload proof should expose city nodes for seeded state')
  assert.ok((backendEntryPayloadProof?.gateNodeCount ?? 0) > 0, 'backend payload proof should expose gate nodes for seeded state')
  assert.ok((backendEntryPayloadProof?.roadCount ?? 0) > 0, 'backend payload proof should expose road network for seeded state')
  assert.ok((backendEntryPayloadProof?.strategicNodeCount ?? 0) > 0, 'backend payload proof should expose strategic nodes for seeded state')
  assert.equal(backendEntryPayloadProof?.maskOnly, false, 'backend seed payload proof should not be mask-only')
  assert.equal(backendEntryPayloadProof?.highResAssetRequired, true, 'backend payload proof should retain high-res boundary')
  assert.equal(statesWithRoadCityGateSeed.length, 13, 'current seeded-road/city/gate coverage should stay explicit')
  assert.equal(maskOnlyStateIds.length, 44, 'current mask-only state gap should stay explicit')
  assert.deepEqual(maskOnlyStateIds, deterministicFallbackStateIds, 'mask-only states should still have deterministic state mask/bounds/zoom fallback')
  assert.equal(highResAssetRequiredStateIds.length, 57, 'all state detail payloads should keep high-res asset trigger explicit')
  assert.equal(stateDetailAssetReadinessMatrix.length, 57, 'asset readiness matrix should cover all 57 states')
  assert.equal(assetReadinessCounts.backendPayloadExists, 57, 'asset readiness matrix should separate backend payload existence')
  assert.equal(assetReadinessCounts.seedCompleteRequiresAuthoritativeAssets, 13, 'asset readiness matrix should preserve 13 seed-complete states')
  assert.equal(assetReadinessCounts.maskOnlyRequiresAuthoritativeData, 44, 'asset readiness matrix should preserve 44 mask-only states')
  assert.equal(assetReadinessCounts.highResAssetRequired, 57, 'asset readiness matrix should preserve 57 high-res-required states')
  assert.equal(assetReadinessCounts.finalVisualAssetExists, 0, 'asset readiness matrix must not claim final visual assets exist')
  assert.ok(
    stateDetailAssetReadinessMatrix.every((row) => row.requiredAssetDataPacks.length === assetDataDispatchPackages.length),
    'each state readiness row should list the dispatchable asset/data package classes',
  )
  assert.deepEqual(screenshotSeedIds, RECOMMENDED_GODOT_SCREENSHOT_STATE_IDS, 'generated screenshot recommendations should remain stable')
  assert.deepEqual(missingScreenshotStateIds, [], 'recommended screenshot state ids should all resolve to runtime payload rows')
  assert.equal(screenshotCases.length, RECOMMENDED_GODOT_SCREENSHOT_STATE_IDS.length, 'recommended screenshot case count')
  assert.ok(
    screenshotCases.every((entry) => entry.expectedScreenFillRatioAt2k >= entry.expectedStateFillRatio2kMin),
    'recommended screenshot cases should meet the static 2K fill lower bound before heavy Godot validation',
  )
  assert.ok(
    screenshotCases.some((entry) => entry.riskCategories.includes('seed_complete')),
    'recommended screenshot cases should cover seeded states',
  )
  assert.ok(
    screenshotCases.some((entry) => entry.riskCategories.includes('mask_only_deterministic_fallback')),
    'recommended screenshot cases should cover mask-only fallback states',
  )
  assert.ok(
    screenshotCases.some((entry) => entry.riskCategories.includes('lowest_state_fill_ratio_2k')),
    'recommended screenshot cases should cover the lowest static 2K fill ratio state',
  )

  console.log(
    JSON.stringify(
      {
        ok: true,
        contract: 'world_map_layout_state_detail_zoom_contract_v0_1',
        mode: 'runtime_57_state_matrix_seed',
        stateCountTotal: allStateIds.length,
        stateDetailPayloadReadyCount: payloadReadyCount,
        stateRoadNetworkReadyCount: roadReadyCount,
        stateStrategicNodesReadyCount: nodeReadyCount,
        missingStateIds,
        emptyRoadStateIds,
        emptyNodeStateIds,
        statesWithRoadSeed,
        statesWithCityNodes,
        statesWithGateNodes,
        statesWithRoadCityGateSeed,
        maskOnlyStateIds,
        deterministicFallbackStateIds,
        highResAssetRequiredStateIds,
        fallbackReasonCounts: Object.fromEntries(fallbackReasonCounts),
        perStateHighResTriggerCounts: Object.fromEntries(perStateHighResTriggerCounts),
        screenFillRatioAt2kRange: screenFillRatioRange,
        roadDensityRange,
        nodeDensityRange,
        samplePayloads: {
          roadCityGateSeed: samplePayloadFromRow(rows.find((row) => statesWithRoadCityGateSeed.includes(row.stateId))),
          maskOnlyDeterministicFallback: samplePayloadFromRow(rows.find((row) => maskOnlyStateIds.includes(row.stateId))),
          smallest2kFillRatio: samplePayloadFromRow(sortedBySmallestFill[0]),
        },
        backendEntryPayloadProof,
        assetReadinessCounts,
        assetDataDispatchPackages,
        stateDetailAssetReadinessMatrix,
        nextGodotScreenshotStateIds: {
          purpose: 'cover seeded, mask-only, smallest-fill, and high-res-required cases',
          stateIds: RECOMMENDED_GODOT_SCREENSHOT_STATE_IDS,
        },
        nextGodotScreenshotStateCases: screenshotCases,
        topScreenFillStates: rows
          .filter((row) => row.screenFillRatioAt2k > 0)
          .sort((left, right) => right.screenFillRatioAt2k - left.screenFillRatioAt2k)
          .slice(0, 8)
          .map((row) => ({
            stateId: row.stateId,
            screenFillRatioAt2k: row.screenFillRatioAt2k,
            roadDensity: row.roadDensity,
            nodeDensity: row.nodeDensity,
            fallbackReason: row.fallbackReason,
            highResTrigger: row.highResTrigger,
          })),
        pendingItems: [
          'Godot consumption + 2K screenshot matrix',
          '57-state full coverage screenshot evidence and gap follow-up',
        ],
      },
      null,
      2,
    ),
  )
}

try {
  main()
} catch (error) {
  console.error('[world_map_layout_state_detail_zoom_contract] failed:', error)
  process.exitCode = 1
}
