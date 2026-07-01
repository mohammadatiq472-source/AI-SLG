import type {
  WorldMapStateDetailTileRef,
  WorldMapStateDetailTileLevel,
  WorldMapStateDetailTilesLayer,
  WorldMapStateRoadSegment,
  WorldMapStateRoadNetworkLayer,
  WorldMapStateStrategicNode,
  WorldMapStateStrategicNodesLayer,
} from '../../../../../shared/contracts/game/world'

export const EAST_HAN_STATE_DETAIL_TILES_LAYER = 'state_detail_tiles'
export const EAST_HAN_STATE_ROAD_NETWORK_LAYER = 'state_road_network'
export const EAST_HAN_STATE_STRATEGIC_NODES_LAYER = 'state_strategic_nodes'

type StateBounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

type StateDetailSkeletonInput = {
  stateId: string
  stateNameZh: string
  coordinateSpace: string
  sourceArtifactId: string
  stateBoundsCells: StateBounds
  stateBoundsPx: StateBounds
  stateFitZoomFor2k: number
  maxDetailZoom: number
}

export function buildStateDetailTilesSkeleton(input: StateDetailSkeletonInput): WorldMapStateDetailTilesLayer {
  return {
    schema_version: 'east_han_state_detail_tiles_layer_v0_1',
    state_id: input.stateId,
    state_name_zh: input.stateNameZh,
    coordinate_space: input.coordinateSpace,
    source_artifact_id: input.sourceArtifactId,
    source_contract_status: 'skeleton_only',
    state_bounds_cells: {
      min_x: input.stateBoundsCells.minX,
      min_y: input.stateBoundsCells.minY,
      max_x: input.stateBoundsCells.maxX,
      max_y: input.stateBoundsCells.maxY,
    },
    state_bounds_px: {
      min_x: input.stateBoundsPx.minX,
      min_y: input.stateBoundsPx.minY,
      max_x: input.stateBoundsPx.maxX,
      max_y: input.stateBoundsPx.maxY,
    },
    state_fit_zoom_for_2k: input.stateFitZoomFor2k,
    max_detail_zoom: input.maxDetailZoom,
    tile_levels: [],
    visible_tile_ids: [],
    loaded_tile_ids: [],
    retained_cache_tile_ids: [],
    unload_candidate_tile_ids: [],
    tiles: [],
    tile_budget: {
      max_visible_tiles: 1,
      current_visible_tiles: 0,
      current_loaded_tiles: 0,
      cache_retained_tiles: 0,
    },
    quality_summary: {
      overview_source_artifact_id: 'east_han_tianxia_yutu_runtime_tile_manifest_v0_1',
      overview_source_image_path:
        'experiments/east_asia_map_pipeline/generated/high_res_map_candidate_v0_6/high_res_map_candidate_v0_6_composite.png',
      overview_preview_image_path:
        'experiments/east_asia_map_pipeline/generated/east_han_tianxia_yutu_owner_index_boundary_renderer_v0_1/east_han_tianxia_yutu_owner_index_boundary_renderer_v0_1_preview_1600w.png',
      state_mask_artifact_id: input.sourceArtifactId,
      state_mask_path: '',
      detail_source_mode: 'overview_8k_plus_state_mask_seed',
      tile_source_mode: 'single_mask_seed',
      screen_fill_ratio_source: 'state_bounds_px_vs_2048x1152',
      screen_fill_ratio_at_2k: 0,
      runtime_visual_status: 'seed_only_not_final_8k_product_visual',
      per_state_high_res_trigger:
        'required_when_single_mask_seed_cannot_hold_city_road_node_density_or_2k_readability',
    },
    fallback_policy: {
      fallback_mode: 'state_mask_only',
      fallback_reason: 'state_detail_tiles_runtime_not_wired',
      cache_policy: 'retain_last_good_tiles',
      hit_test_policy: 'state_and_nodes',
    },
  }
}

export function buildStateRoadNetworkSkeleton(input: StateDetailSkeletonInput): WorldMapStateRoadNetworkLayer {
  return {
    schema_version: 'east_han_state_road_network_layer_v0_1',
    state_id: input.stateId,
    state_name_zh: input.stateNameZh,
    coordinate_space: input.coordinateSpace,
    source_contract_status: 'skeleton_only',
    source_artifact_id: input.sourceArtifactId,
    density_policy: 'conservative_state_detail_only',
    density_summary: {
      road_count: 0,
      seeded_from_existing_jump_targets: false,
      per_state_high_res_required: true,
    },
    roads: [],
  }
}

export function buildStateStrategicNodesSkeleton(input: StateDetailSkeletonInput): WorldMapStateStrategicNodesLayer {
  return {
    schema_version: 'east_han_state_strategic_nodes_layer_v0_1',
    state_id: input.stateId,
    state_name_zh: input.stateNameZh,
    coordinate_space: input.coordinateSpace,
    source_contract_status: 'skeleton_only',
    source_artifact_id: input.sourceArtifactId,
    hit_test_policy: 'node_radius_first_then_state_bounds',
    density_summary: {
      node_count: 0,
      includes_city_markers: false,
      includes_gate_jump_targets: false,
      per_state_high_res_required: true,
    },
    nodes: [],
  }
}

type StateDetailRuntimeInput = StateDetailSkeletonInput & {
  tileLevels: WorldMapStateDetailTileLevel[]
  tiles: WorldMapStateDetailTileRef[]
  roads: WorldMapStateRoadSegment[]
  nodes: WorldMapStateStrategicNode[]
  fallbackReason?: string
}

export function buildStateDetailTilesRuntime(input: StateDetailRuntimeInput): WorldMapStateDetailTilesLayer {
  const tileIds = input.tiles.map((tile) => tile.tile_id)
  const screenFillRatioAt2k = Math.min(1, Math.max(2048 / Math.max(1, input.stateBoundsPx.maxX - input.stateBoundsPx.minX + 1), 1152 / Math.max(1, input.stateBoundsPx.maxY - input.stateBoundsPx.minY + 1)))
  return {
    schema_version: 'east_han_state_detail_tiles_layer_v0_1',
    state_id: input.stateId,
    state_name_zh: input.stateNameZh,
    coordinate_space: input.coordinateSpace,
    source_artifact_id: input.sourceArtifactId,
    source_contract_status: 'runtime_ready',
    state_bounds_cells: {
      min_x: input.stateBoundsCells.minX,
      min_y: input.stateBoundsCells.minY,
      max_x: input.stateBoundsCells.maxX,
      max_y: input.stateBoundsCells.maxY,
    },
    state_bounds_px: {
      min_x: input.stateBoundsPx.minX,
      min_y: input.stateBoundsPx.minY,
      max_x: input.stateBoundsPx.maxX,
      max_y: input.stateBoundsPx.maxY,
    },
    state_fit_zoom_for_2k: input.stateFitZoomFor2k,
    max_detail_zoom: input.maxDetailZoom,
    tile_levels: input.tileLevels,
    visible_tile_ids: tileIds,
    loaded_tile_ids: tileIds,
    retained_cache_tile_ids: tileIds,
    unload_candidate_tile_ids: [],
    tiles: input.tiles,
    tile_budget: {
      max_visible_tiles: 4,
      current_visible_tiles: tileIds.length,
      current_loaded_tiles: tileIds.length,
      cache_retained_tiles: tileIds.length,
    },
    quality_summary: {
      overview_source_artifact_id: 'east_han_tianxia_yutu_runtime_tile_manifest_v0_1',
      overview_source_image_path:
        'experiments/east_asia_map_pipeline/generated/high_res_map_candidate_v0_6/high_res_map_candidate_v0_6_composite.png',
      overview_preview_image_path:
        'experiments/east_asia_map_pipeline/generated/east_han_tianxia_yutu_owner_index_boundary_renderer_v0_1/east_han_tianxia_yutu_owner_index_boundary_renderer_v0_1_preview_1600w.png',
      state_mask_artifact_id: input.sourceArtifactId,
      state_mask_path: input.tiles[0]?.asset_path ?? '',
      detail_source_mode: 'overview_8k_plus_state_mask_seed',
      tile_source_mode: 'single_mask_seed',
      screen_fill_ratio_source: 'state_bounds_px_vs_2048x1152',
      screen_fill_ratio_at_2k: screenFillRatioAt2k,
      runtime_visual_status: 'seed_only_not_final_8k_product_visual',
      per_state_high_res_trigger:
        'required_when_single_mask_seed_cannot_hold_city_road_node_density_or_2k_readability',
    },
    fallback_policy: {
      fallback_mode: 'state_mask_only',
      fallback_reason: input.fallbackReason ?? '',
      cache_policy: 'retain_last_good_tiles',
      hit_test_policy: 'state_and_nodes',
    },
  }
}

export function buildStateRoadNetworkRuntime(input: StateDetailRuntimeInput): WorldMapStateRoadNetworkLayer {
  return {
    schema_version: 'east_han_state_road_network_layer_v0_1',
    state_id: input.stateId,
    state_name_zh: input.stateNameZh,
    coordinate_space: input.coordinateSpace,
    source_contract_status: 'runtime_ready',
    source_artifact_id: input.sourceArtifactId,
    density_policy: 'conservative_state_detail_only',
    density_summary: {
      road_count: input.roads.length,
      seeded_from_existing_jump_targets: true,
      per_state_high_res_required: true,
    },
    roads: input.roads,
  }
}

export function buildStateStrategicNodesRuntime(input: StateDetailRuntimeInput): WorldMapStateStrategicNodesLayer {
  return {
    schema_version: 'east_han_state_strategic_nodes_layer_v0_1',
    state_id: input.stateId,
    state_name_zh: input.stateNameZh,
    coordinate_space: input.coordinateSpace,
    source_contract_status: 'runtime_ready',
    source_artifact_id: input.sourceArtifactId,
    hit_test_policy: 'node_radius_first_then_state_bounds',
    density_summary: {
      node_count: input.nodes.length,
      includes_city_markers: input.nodes.some((node) => node.node_type === 'city'),
      includes_gate_jump_targets: input.nodes.some((node) => node.node_type === 'gate'),
      per_state_high_res_required: true,
    },
    nodes: input.nodes,
  }
}
