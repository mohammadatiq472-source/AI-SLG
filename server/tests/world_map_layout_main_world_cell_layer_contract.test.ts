import assert from 'node:assert/strict'
import {
  getAvailablePort,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

const WORLD_ID = 'unified_aoi_v0_6_formal_real_map_data_1km'
const COORDINATE_SPACE = 'real_map_data_1km.cell_1km'

const LAYERED_QUERY =
  '/api/world/map-layout?scope=viewport' +
  '&layer=layered' +
  `&worldId=${WORLD_ID}` +
  `&coordinateSpace=${COORDINATE_SPACE}` +
  '&centerX=4387' +
  '&centerY=2482' +
  '&visibleCells=512x320' +
  '&visibleSizeCells=512x320' +
  '&preloadMargin=64' +
  '&preloadMarginCells=64' +
  '&chunkSize=64' +
  '&includeLayers=base_map,main_world_cells,derived_masks,maritime_passability,resource_overlay,city_gate_anchors,main_world_mountain_boundaries,main_world_chokepoints,cell_overrides,labels'

function assertAnchorFootprintTileIds(anchor: Record<string, unknown> | undefined, source: string) {
  assert.ok(anchor, `${source} should exist`)
  const footprintCells = anchor.footprint_cells
  assert.ok(Array.isArray(footprintCells), `${source} should expose footprint_cells`)
  const width = Number(footprintCells[0] ?? 0)
  const height = Number(footprintCells[1] ?? 0)
  assert.ok(width > 0 && height > 0, `${source} footprint_cells should be positive`)
  const footprintTileIds = anchor.footprint_tile_ids
  assert.ok(Array.isArray(footprintTileIds), `${source} should expose footprint_tile_ids`)
  assert.equal(footprintTileIds.length, width * height, `${source} footprint_tile_ids count should match footprint cells`)
  const cell = readObject(anchor.cell_1km)
  const centerCellId = `${WORLD_ID}:${Number(cell.x)}:${Number(cell.y)}`
  assert.ok(footprintTileIds.includes(centerCellId), `${source} footprint_tile_ids should include center cell`)
  assert.equal(anchor.footprint_anchor_policy, 'center_cell', `${source} footprint anchor policy`)
}

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail)

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const response = await requestJson(baseUrl, LAYERED_QUERY, 'GET')
    assert.equal(response.status, 200, `main-world layered layout failed: ${JSON.stringify(response.data)}`)
    const payload = readObject(response.data)
    assert.equal(payload.schema_version, 'east_han_godot_main_map_layered_response_v0_1', 'schema version')

    const layerOrder = payload.layer_order
    assert.ok(Array.isArray(layerOrder), 'layer_order should be an array')
    assert.ok(layerOrder.includes('main_world_cells'), 'layer_order should include the selectable 1km cell layer')
    assert.ok(
      layerOrder.includes('main_world_mountain_boundaries'),
      'layer_order should include the formal main-world mountain boundary layer',
    )

    const chunkLayer = readObject(payload.chunk_layer)
    const loadedChunkIds = chunkLayer.loaded_chunk_ids
    assert.ok(Array.isArray(loadedChunkIds), 'loaded_chunk_ids should be an array')
    assert.ok(loadedChunkIds.length > 0, 'loaded chunks should not be empty')

    const cellLayer = readObject(payload.main_world_cell_layer)
    assert.equal(cellLayer.schema_version, 'east_han_main_world_cell_layer_v0_1', 'cell layer schema')
    assert.equal(cellLayer.world_id, WORLD_ID, 'cell layer world id')
    assert.equal(cellLayer.coordinate_space, COORDINATE_SPACE, 'cell layer coordinate space')
    assert.deepEqual(cellLayer.chunk_size_cells, [64, 64], 'cell layer chunk size')
    assert.equal(cellLayer.renderer_mode, 'chunk_range_selectable_cells', 'cell layer renderer mode')
    assert.equal(cellLayer.projection_scaled_to_preview, false, 'main-world cell layer should use direct 1km projection')
    assert.equal(cellLayer.preview_bridge_enabled, false, 'preview bridge should be disabled for 1km renderer')
    assert.equal(
      Object.prototype.hasOwnProperty.call(cellLayer, 'legacy_preview_bridge_enabled'),
      false,
      'main-world cell layer payload should no longer expose legacy_preview_bridge_enabled after replacement migration',
    )
    assert.equal(cellLayer.zero_level_ground_object_mode, 'implicit_base_map', '0-level ground should stay implicit')
    assert.equal(cellLayer.zero_level_object_upsert_count, 0, '0-level ground should not be emitted as objects')
    assert.equal(cellLayer.object_upsert_count, 0, 'cell layer should not materialize every selectable cell')
    assert.equal(cellLayer.loaded_chunk_count, loadedChunkIds.length, 'cell layer should follow loaded chunk count')

    const baseMapLayer = readObject(payload.base_map_layer)
    assert.equal(baseMapLayer.renderer_mode, 'chunk_texture_substrate', 'base map should expose 1km chunk texture substrate renderer')
    assert.equal(baseMapLayer.projection_scaled_to_preview, false, 'base map should not scale through the preview bridge')
    assert.equal(baseMapLayer.preview_bridge_enabled, false, 'base map preview bridge should be disabled')
    assert.equal(
      Object.prototype.hasOwnProperty.call(baseMapLayer, 'legacy_preview_bridge_enabled'),
      false,
      'base map payload should no longer expose legacy_preview_bridge_enabled after replacement migration',
    )
    assert.equal(baseMapLayer.coordinate_space, COORDINATE_SPACE, 'base map coordinate space')
    assert.deepEqual(baseMapLayer.chunk_size_cells, [64, 64], 'substrate chunk size')
    const zeroLevelVisual = readObject(baseMapLayer.zero_level_ground_visual)
    assert.equal(zeroLevelVisual.object_mode, 'implicit_base_map', '0-level substrate should remain implicit base-map visual')
    assert.equal(zeroLevelVisual.object_upsert_count, 0, '0-level substrate should not emit objects')
    assert.equal(
      zeroLevelVisual.asset_path,
      'res://assets/themes/slgclient/current/world/substrate/world_cell_zero_level_substrate_v1.png',
      '0-level substrate should use the accepted runtime seed asset',
    )
    const substrateChunkTextures = baseMapLayer.substrate_chunk_textures
    assert.ok(Array.isArray(substrateChunkTextures), 'substrate_chunk_textures should be an array')
    assert.equal(substrateChunkTextures.length, loadedChunkIds.length, 'substrate texture refs should follow loaded chunks')
    const firstTexture = readObject(substrateChunkTextures[0])
    assert.ok(loadedChunkIds.includes(firstTexture.chunk_id), 'substrate texture chunk id should be loaded')
    assert.equal(firstTexture.texture_kind, 'procedural_real_map_1km_substrate', 'substrate texture kind')
    assert.equal(firstTexture.cell_size_km, 1, 'substrate texture cell size')
    assert.deepEqual(firstTexture.chunk_size_cells, [64, 64], 'substrate texture chunk size cells')

    const ranges = cellLayer.selectable_chunk_ranges
    assert.ok(Array.isArray(ranges), 'selectable_chunk_ranges should be an array')
    assert.equal(ranges.length, loadedChunkIds.length, 'selectable ranges should follow loaded chunks')

    const firstRange = readObject(ranges[0])
    const firstRangeCellRange = readObject(firstRange.cell_range)
    const firstTextureCellRange = readObject(firstTexture.cell_range)
    assert.ok(loadedChunkIds.includes(firstRange.chunk_id), 'range chunk id should be loaded')
    assert.deepEqual(firstRange.chunk_size_cells, [64, 64], 'range chunk size')
    assert.ok(Number(firstRangeCellRange.start_x) >= 0, 'range start x')
    assert.ok(Number(firstRangeCellRange.start_y) >= 0, 'range start y')
    assert.ok(Number(firstRange.selectable_cell_count) > 0, 'range selectable cell count')
    assert.ok(Number(firstRange.selectable_cell_count) <= 4096, 'single chunk should not exceed 64x64 cells')
    assert.equal(firstRange.object_upsert_count, 0, 'range should not emit selectable cells as objects')
    assert.equal(firstTextureCellRange.start_x, firstRangeCellRange.start_x, 'substrate and cell range start x should align')

    const totalSelectable = (ranges as unknown[]).reduce((sum: number, item) => sum + Number(readObject(item).selectable_cell_count), 0)
    assert.equal(cellLayer.selectable_cell_count, totalSelectable, 'cell layer selectable count should match ranges')
    assert.ok(Number(cellLayer.selectable_cell_count) > 20_000, 'viewport preload should expose a meaningful selectable cell proxy budget')
    assert.ok(Number(cellLayer.selectable_cell_count) < 1_000_000, 'cell proxy budget should remain bounded by viewport chunks')

    const resourceLayer = readObject(payload.resource_overlay_layer)
    assert.equal(resourceLayer.zero_level_object_upsert_count, 0, 'resources should not turn 0-level ground into objects')
    const resourceExclusion = readObject(resourceLayer.mountain_boundary_resource_exclusion)
    assert.equal(
      resourceExclusion.source_artifact_id,
      'mountain_barrier_main_world_runtime_contract_v0_47',
      'resource overlay should consume the v0.47 stable-direct mountain boundary exclusion artifact',
    )
    assert.equal(
      resourceExclusion.sampler_hook,
      'apply_after_base_eligible_mask_before_stable_density_selection',
      'resource exclusion must run before resource overlay eligibility is finalized',
    )
    assert.equal(
      resourceExclusion.hard_exclusion_source,
      'resourceGenerationExclusionBinding.hardExcludedWorldCells',
      'resource exclusion must use the translated reservedLocalCells/hardExcludedWorldCells contract only',
    )
    assert.equal(
      resourceExclusion.visual_overhang_only_cells_block_resources,
      false,
      'visualOverhangOnlyCells should remain non-hard-blocking diagnostics',
    )
    assert.ok(
      Number(resourceExclusion.hard_reserved_cell_count_in_loaded_viewport) > 0,
      'loaded viewport should expose hard-reserved mountain cells for resource exclusion',
    )
    const resourceObjects = resourceLayer.sample_resource_objects
    assert.ok(Array.isArray(resourceObjects), 'resource samples should be an array')
    assert.ok(resourceObjects.length > 0, 'resource samples should exist')
    for (const object of resourceObjects.slice(0, 12)) {
      const resource = readObject(object)
      assert.equal(resource.kind, 'resource', 'resource kind')
      assert.equal(resource.resource_eligible, true, 'resource object should be flagged as eligible-mask backed')
      assert.ok(
        typeof resource.asset_path === 'string' &&
          resource.asset_path.startsWith('res://assets/themes/slgclient/current/world/resources/'),
        'resource object should use the accepted Godot resource asset path',
      )
      assert.equal(
        resource.mountain_boundary_resource_excluded,
        false,
        'resource object should not occupy a hard-reserved mountain boundary cell',
      )
    }

    const mountainBoundaryLayer = readObject(payload.main_world_mountain_boundary_layer)
    assert.equal(
      mountainBoundaryLayer.schema_version,
      'east_han_main_world_mountain_boundary_layer_v0_47',
      'main-world mountain boundary layer schema',
    )
    assert.equal(mountainBoundaryLayer.activation, 'main_world_only', 'mountain boundary layer should be main-world only')
    assert.equal(
      mountainBoundaryLayer.source_artifact_id,
      'mountain_barrier_main_world_runtime_contract_v0_47',
      'mountain boundary layer should read the v0.47 stable-direct runtime contract',
    )
    assert.equal(
      Number(mountainBoundaryLayer.placement_count),
      142,
      'v0.47 should consume the manual-locked Yingchuan/Yuzhou boundary set and the D30 promoted outer-contact boundary',
    )
    assert.equal(
      Number(mountainBoundaryLayer.formal_state_boundary_placement_count),
      36,
      'the 36 aggregate state-to-state boundaries should remain accounted for as deduped audit input',
    )
    assert.equal(
      Number(mountainBoundaryLayer.promoted_outer_contact_placement_count),
      50,
      'v0.47 should promote all true stable-direct outer-contact boundaries after D30 manual confirmation',
    )
    assert.equal(
      Number(mountainBoundaryLayer.outer_contact_commandery_boundary_count),
      50,
      'stable polygon inventory should expose all outer-contact commandery boundaries',
    )
    assert.equal(
      Number(mountainBoundaryLayer.outer_contact_commandery_mountain_placement_count),
      50,
      'cyan outer-contact candidates should include the D30 manually confirmed true short boundary',
    )
    assert.equal(
      Number(mountainBoundaryLayer.accepted_ownership_state_count),
      13,
      'accepted region ownership should still resolve to the East Han thirteen states',
    )
    assert.equal(
      Number(mountainBoundaryLayer.suppressed_outer_contact_placement_count),
      0,
      'v0.39 should resolve the four previously suppressed outer contacts through compact presets',
    )
    assert.equal(
      Number(mountainBoundaryLayer.compact_reviewed_outer_contact_placement_count),
      0,
      'v0.47 should replace old compact-reviewed outer contacts with stable-direct outer-contact placements',
    )
    assert.equal(
      Number(mountainBoundaryLayer.fine_piece_library_added_count),
      10,
      'fine mountain piece family should remain available: caps, short straights, short bends, T/cross pieces, and pass connectors',
    )
    assert.equal(
      Number(mountainBoundaryLayer.commandery_boundary_inventory_count),
      365,
      'v0.47 should expose the stable polygon commandery-to-commandery boundary inventory, not just aggregate state segments',
    )
    assert.equal(
      Number(mountainBoundaryLayer.cross_state_commandery_boundary_count),
      99,
      'stable-direct cross-state commandery borders include Yingchuan/Yuzhou manual-lock boundaries before ring suppression',
    )
    assert.equal(
      Number(mountainBoundaryLayer.cross_state_commandery_mountain_placement_count),
      91,
      'v0.47 should suppress the reviewed false contacts plus the seven Yingchuan manual-lock closed-loop ring segments',
    )
    assert.equal(
      Number(mountainBoundaryLayer.stable_vs_direct_cross_state_difference_count),
      0,
      'v0.47 stable-direct source should have no remaining cross-state commandery gap before the explicit 5-point geometry review',
    )
    assert.equal(
      Number(mountainBoundaryLayer.deduped_aggregate_state_boundary_placement_count),
      36,
      'v0.47 should account for the 36 older aggregate state-boundary placements during dedupe',
    )
    assert.equal(
      Number(mountainBoundaryLayer.deduped_legacy_outer_contact_placement_count),
      36,
      'v0.47 should account for the 36 older outer-contact placements during stable-direct outer-contact replacement',
    )
    assert.equal(
      mountainBoundaryLayer.aggregate_state_boundary_render_policy,
      'deduped_metadata_only_when_stable_direct_commandery_boundary_exists',
      'v0.47 should avoid rendering duplicate aggregate mountains over direct commandery mountain chains',
    )
    assert.equal(
      mountainBoundaryLayer.outer_contact_replacement_render_policy,
      'deduped_metadata_only_when_stable_direct_outer_contact_boundary_exists',
      'v0.47 should avoid rendering duplicate old outer-contact mountains over stable-direct outer contact chains',
    )
    assert.equal(
      Object.prototype.hasOwnProperty.call(mountainBoundaryLayer, 'legacy_outer_contact_render_policy'),
      false,
      'mountain boundary payload should no longer expose legacy_outer_contact_render_policy after replacement migration',
    )
    assert.equal(
      mountainBoundaryLayer.map_source_policy,
      'runtime_owner_index_boundary_renderer_v0_1_not_1920_authoring_overlay',
      'v0.47 should make the Tianxia Yutu source map policy explicit',
    )
    assert.equal(
      Number(mountainBoundaryLayer.geometry_issue_count),
      5,
      'v0.47 should keep the five magenta diagnostic points as the only reviewed set',
    )
    assert.equal(
      Number(mountainBoundaryLayer.false_thin_contact_suppressed_count),
      1,
      'v0.47 should classify one of the five magenta diagnostics as false after D30 promotion',
    )
    assert.equal(
      Number(mountainBoundaryLayer.true_tiny_boundary_retained_count),
      4,
      'v0.47 should retain four of the five magenta diagnostics as true short boundaries after D30 promotion',
    )
    assert.equal(
      mountainBoundaryLayer.geometry_issue_classification_status,
      'PASS_5_REVIEWED_1_SUPPRESSED_4_RETAINED',
      'v0.47 should expose the explicit five-point classification gate',
    )
    assert.equal(
      Number(mountainBoundaryLayer.state_component_island_count),
      1,
      'v0.47 should retain exactly one approved Yingchuan/Yuzhou manual-lock state component island',
    )
    assert.equal(
      Number(mountainBoundaryLayer.state_component_boundary_suppressed_count),
      7,
      'v0.47 should suppress the seven Yingchuan/Yuzhou closed-loop ring segments',
    )
    assert.equal(
      mountainBoundaryLayer.state_component_classification_status,
      'PASS_1_ISLAND_7_BOUNDARIES_SUPPRESSED',
      'v0.47 should expose the explicit Yingchuan/Yuzhou manual-lock state-component gate',
    )
    assert.equal(
      mountainBoundaryLayer.boundary_sample_point_render_policy,
      'point_cloud_no_direct_polyline_for_unordered_adjacency_samples',
      'v0.47 review imagery must not connect unordered adjacency samples into fake straight boundary chords',
    )
    assert.equal(
      mountainBoundaryLayer.anchor_point_ordering_policy,
      'sort_sample_points_by_dominant_axis_before_anchor_selection',
      'v0.47 mountain anchors should use deterministic dominant-axis ordering, not raw sample order',
    )
    assert.equal(
      mountainBoundaryLayer.tianxia_yutu_direct_polyline_boundary_policy,
      'forbidden_use_owner_index_neighbor_difference_renderer_instead',
      'v0.47 must keep Tianxia Yutu source boundaries on the owner-index renderer, not generated direct polylines',
    )
    assert.equal(
      mountainBoundaryLayer.large_world_placement_continuity_status,
      'PASS_LARGE_WORLD_PLACEMENT_AUDIT_READY',
      'v0.47 should expose the large-world continuity audit before broad mountain runtime acceptance',
    )
    assert.equal(
      Number(mountainBoundaryLayer.large_world_renderable_placement_count),
      142,
      'v0.47 large-world audit should cover every rendered main-world mountain placement',
    )
    assert.equal(
      Number(mountainBoundaryLayer.large_world_state_pair_group_count),
      27,
      'v0.47 should group cross-state mountain placements by state-pair coverage',
    )
    assert.equal(
      Number(mountainBoundaryLayer.large_world_outer_contact_group_count),
      21,
      'v0.47 should group outer-contact mountain placements by outer contact side',
    )
    assert.equal(
      Number(mountainBoundaryLayer.large_world_duplicate_source_segment_count),
      0,
      'v0.47 should not render duplicate mountains for the same source boundary segment',
    )
    assert.equal(
      Number(mountainBoundaryLayer.large_world_old_aggregate_rendered_count),
      0,
      'v0.47 should keep old aggregate state-boundary pieces metadata-only during stable-direct runtime rendering',
    )
    assert.equal(
      Number(mountainBoundaryLayer.large_world_missing_piece_instance_count),
      0,
      'v0.47 should ensure every runtime placement has renderable piece instances',
    )
    assert.equal(
      Number(mountainBoundaryLayer.large_world_missing_resource_contract_count),
      0,
      'v0.47 should ensure every runtime placement preserves resource exclusion contract fields',
    )
    assert.equal(
      Number(mountainBoundaryLayer.large_world_pass_wall_node_count),
      0,
      'v0.47 should not create independent pass-wall nodes while rendering mountain boundaries',
    )
    const acceptedChokepointArtSource = readObject(mountainBoundaryLayer.accepted_chokepoint_art_source)
    assert.equal(
      acceptedChokepointArtSource.integration_status,
      'accepted_art_exists_not_auto_spawned_by_v0_47_mountain_boundary_runtime',
      'accepted pass-wall/chokepoint art should be explicit even though v0.47 mountain boundary placement does not auto-spawn it',
    )
    assert.equal(
      acceptedChokepointArtSource.runtime_node_policy,
      'gate/chokepoint anchors stay in existing gate jump/navigation system until a dedicated pass-wall runtime adapter is added',
      'pass-wall runtime policy should not be confused with generic mountain placement rendering',
    )
    assert.equal(
      acceptedChokepointArtSource.source_contract_artifact_id,
      'mountain_barrier_contested_chokepoint_contract_v0_31',
      'accepted pass-wall source should point to the contested chokepoint contract, not the generic mountain manifest',
    )
    assert.equal(
      acceptedChokepointArtSource.earlier_acceptance_review_path,
      'experiments/east_asia_map_pipeline/generated/mountain_barrier_contested_chokepoint_contract_v0_18/reviews/real_ridge_stitch_acceptance_review_v0_18.md',
      'v0.18 real-ridge review should remain discoverable for future handoff windows',
    )
    const chokepointLayer = readObject(payload.main_world_chokepoint_layer)
    assert.ok(layerOrder.includes('main_world_chokepoints'), 'main-world pass-wall chokepoint layer should be requestable')
    assert.equal(
      chokepointLayer.schema_version,
      'east_han_main_world_chokepoint_layer_v0_1',
      'main-world chokepoint layer schema',
    )
    assert.equal(chokepointLayer.activation, 'main_world_only', 'chokepoint layer should be main-world only')
    assert.equal(
      chokepointLayer.source_anchor_policy,
      'reuse_existing_gate_jump_targets_and_city_gate_anchor_layer',
      'chokepoint layer must reuse the existing gate/jump/navigation anchor chain',
    )
    assert.equal(
      chokepointLayer.source_contract_artifact_id,
      'mountain_barrier_contested_chokepoint_contract_v0_31',
      'chokepoint layer should consume the accepted v0.31 pass-wall master',
    )
    assert.equal(
      chokepointLayer.stable_metadata_contract_version,
      'main_world_chokepoint_metadata_v0_1',
      'main-world chokepoint layer should expose stable metadata for non-rendering consumers',
    )
    assert.equal(
      chokepointLayer.metadata_consumer_policy,
      'external overview surfaces may consume stable_metadata for labels/hover/jump context but must not redraw main-world pass-wall sprites',
      'chokepoint metadata consumers should not duplicate main-world pass-wall rendering',
    )
    assert.equal(
      readObject(chokepointLayer.accepted_chokepoint_art_source).runtime_asset_path,
      'res://assets/themes/slgclient/current/world/chokepoints/main_world_chokepoint_pass_wall_east_west_no_basepad_master_v0_31.png',
      'chokepoint layer should point Godot at the dedicated pass-wall runtime asset',
    )
    assert.ok(
      Number(chokepointLayer.accepted_pass_wall_node_count) > 0,
      'current viewport should expose accepted pass-wall nodes from gate jump targets',
    )
    const chokepointNodes = chokepointLayer.visible_nodes
    assert.ok(Array.isArray(chokepointNodes), 'chokepoint layer should expose visible_nodes')
    const emittedBoundaryPairs = new Set<string>()
    for (const node of chokepointNodes) {
      const chokepointNode = readObject(node)
      assert.equal(chokepointNode.target_scope, 'gate', 'pass-wall node should keep gate target scope')
      assert.equal(chokepointNode.kind, 'pass_wall', 'pass-wall node kind')
      assert.equal(
        chokepointNode.navigation_reuse_policy,
        'reuses accepted gate jump target and city_gate_anchor_layer semantics; this layer does not create a new navigation system',
        'pass-wall node should not introduce a parallel navigation system',
      )
      assert.equal(
        chokepointNode.creates_mountain_boundary_placement,
        false,
        'pass-wall node should stay separate from generic mountain boundary placement generation',
      )
      const boundaryPairKey = String(chokepointNode.boundary_pair_key ?? '')
      assert.ok(boundaryPairKey.length > 0, 'pass-wall node should expose its large-boundary dedupe key')
      assert.equal(
        emittedBoundaryPairs.has(boundaryPairKey),
        false,
        `large state boundary should emit at most one pass-wall node: ${boundaryPairKey}`,
      )
      emittedBoundaryPairs.add(boundaryPairKey)
      assert.equal(chokepointNode.formal_chokepoint, true, 'pass-wall node should mark formal chokepoint status')
      assert.equal(chokepointNode.formal_pass_wall, true, 'pass-wall node should mark formal pass-wall status')
      assert.equal(
        chokepointNode.source_artifact_id,
        'mountain_barrier_contested_chokepoint_contract_v0_31',
        'pass-wall node should expose source artifact id',
      )
      assert.equal(chokepointNode.source_contract_version, 'v0_31', 'pass-wall node should expose source contract version')
      assert.ok(String(chokepointNode.gate_id ?? '').length > 0, 'pass-wall node should expose stable gate id')
      assert.ok(String(chokepointNode.gate_name ?? '').length > 0, 'pass-wall node should expose stable gate name')
      const worldCoordinate = readObject(chokepointNode.world_coordinate)
      assert.equal(
        worldCoordinate.coordinate_space,
        'real_map_data_1km.cell_1km',
        'pass-wall metadata should expose world coordinate space',
      )
      const worldCoordinateCell = readObject(worldCoordinate.cell_1km)
      assert.ok(Number.isFinite(Number(worldCoordinateCell.x)), 'pass-wall metadata should expose world coordinate x')
      assert.ok(Number.isFinite(Number(worldCoordinateCell.y)), 'pass-wall metadata should expose world coordinate y')
      const adjacentStates = readObject(chokepointNode.adjacent_states)
      const adjacentCommanderies = readObject(chokepointNode.adjacent_commanderies)
      assert.ok(String(readObject(adjacentStates.from).id).length > 0, 'pass-wall metadata should expose from state id')
      assert.ok(String(readObject(adjacentStates.to).id).length > 0, 'pass-wall metadata should expose to state id')
      assert.ok(
        String(readObject(adjacentCommanderies.from).label).length > 0,
        'pass-wall metadata should expose from commandery label',
      )
      assert.ok(
        String(readObject(adjacentCommanderies.to).label).length > 0,
        'pass-wall metadata should expose to commandery label',
      )
      const stableMetadata = readObject(chokepointNode.stable_metadata)
      assert.equal(
        stableMetadata.metadata_contract_version,
        'main_world_chokepoint_metadata_v0_1',
        'pass-wall node should carry the stable metadata contract version',
      )
      assert.equal(stableMetadata.gate_id, chokepointNode.gate_id, 'stable metadata gate id should mirror node gate id')
      assert.equal(
        stableMetadata.formal_pass_wall,
        true,
        'stable metadata should mark that this node has formal pass-wall art',
      )
      const renderPieces = chokepointNode.render_pieces
      assert.ok(Array.isArray(renderPieces) && renderPieces.length === 1, 'pass-wall node should render exactly one master piece')
      const renderPiece = readObject(renderPieces[0])
      assert.equal(renderPiece.piece_id, 'pass_wall_master_v0_31', 'pass-wall render piece id')
      assert.equal(
        renderPiece.asset_path,
        'res://assets/themes/slgclient/current/world/chokepoints/main_world_chokepoint_pass_wall_east_west_no_basepad_master_v0_31.png',
        'pass-wall render piece should use the dedicated runtime asset path',
      )
    }
    assert.equal(
      Number(mountainBoundaryLayer.same_state_commandery_boundary_count),
      162,
      'same-state commandery borders should be counted but not promoted into state-boundary mountains by default',
    )
    assert.equal(
      mountainBoundaryLayer.same_state_commandery_boundary_mountain_policy,
      'not_mountain_by_default',
      'same-state commandery borders should not be confused with state-to-state mountain boundaries',
    )
    assert.equal(
      Number(mountainBoundaryLayer.stable_adjacency_cross_state_pair_count),
      99,
      'stable polygon adjacency should define the complete cross-state commandery target set',
    )
    assert.equal(
      mountainBoundaryLayer.state_boundary_coverage_status,
      'PASS_36_OF_36',
      'state-to-state province border coverage should be explicit',
    )
    assert.equal(
      mountainBoundaryLayer.hard_exclusion_source,
      'resourceGenerationExclusionBinding.hardExcludedWorldCells',
      'mountain layer should expose the hard resource exclusion source used by the resource overlay',
    )
    assert.equal(
      mountainBoundaryLayer.resource_generation_policy,
      'reject resource generation on translated reservedLocalCells/hardExcludedWorldCells; visualOverhangOnlyCells remain diagnostics',
      'resource generation should reject only formal translated hard cells, not visual overhang diagnostics',
    )
    assert.ok(Array.isArray(mountainBoundaryLayer.placement_focus_targets), 'mountain layer should expose placement focus targets for on-screen smoke')
    const placementCatalog = mountainBoundaryLayer.placement_catalog_sample as unknown[]
    assert.ok(Array.isArray(placementCatalog), 'mountain layer catalog should expose the full runtime placement set')
    assert.equal(placementCatalog.length, 142, 'placement catalog should expose all runtime placements for batch preset selection')
    const catalogLineRoleCounts = new Map<string, number>()
    let ordinarySameStateMountainPlacementCount = 0
    let passConnectorPlacementUseCount = 0
    let createsChokepointPlacementCount = 0
    const passConnectorPieceIds = new Set(['fine_pass_left_connector', 'fine_pass_right_connector'])
    for (const item of placementCatalog) {
      const placement = readObject(item)
      const lineRole = String(placement.line_role ?? '')
      const sourceBoundaryKind = String(readObject(placement.source_boundary_segment).kind ?? '')
      const pieceInstances = placement.pieceInstances as unknown[]
      catalogLineRoleCounts.set(lineRole, (catalogLineRoleCounts.get(lineRole) ?? 0) + 1)
      if (sourceBoundaryKind === 'same_state_commandery_border' && lineRole !== 'special_internal_commandery_boundary_blockade_candidate') {
        ordinarySameStateMountainPlacementCount += 1
      }
      if (pieceInstances.some((piece) => passConnectorPieceIds.has(String(readObject(piece).pieceId ?? '')))) {
        passConnectorPlacementUseCount += 1
      }
      if (placement.creates_chokepoint === true) {
        createsChokepointPlacementCount += 1
      }
      assert.ok(
        Number(placement.reserved_local_cell_count) > 0,
        'each runtime placement must carry reservedLocalCells for resource exclusion',
      )
    }
    assert.equal(
      ordinarySameStateMountainPlacementCount,
      0,
      'ordinary same-state commandery borders must not become main-world mountain placements',
    )
    assert.equal(
      passConnectorPlacementUseCount,
      0,
      'v0.47 generic mountain boundary placements must not silently consume pass connector pieces',
    )
    assert.equal(
      createsChokepointPlacementCount,
      0,
      'v0.47 generic mountain boundary placements must not auto-create chokepoint nodes',
    )
    assert.equal(
      catalogLineRoleCounts.get('cross_state_commandery_boundary_blockade_candidate'),
      91,
      'cross-state batch preset source should be stable-direct cross-state commandery placements',
    )
    assert.equal(
      catalogLineRoleCounts.get('stable_direct_outer_contact_boundary_blockade_candidate'),
      50,
      'outer-contact batch preset source should be the full set of promoted stable-direct outer contacts',
    )
    assert.equal(
      catalogLineRoleCounts.get('special_internal_commandery_boundary_blockade_candidate'),
      1,
      'special internal batch preset source should remain the single Hanzhong-Ba mountain blockade placement, not a pass-wall spawn',
    )
    const outerFocusTarget = (mountainBoundaryLayer.placement_focus_targets as unknown[]).find((item) => {
      return readObject(item).line_role === 'stable_direct_outer_contact_boundary_blockade_candidate'
    })
    assert.ok(outerFocusTarget, 'placement focus targets should include stable-direct outer-contact mountain placements')
    assert.ok(
      Array.isArray(readObject(outerFocusTarget).first_cell_1km),
      'placement focus target should expose a first 1km cell for viewport focus',
    )
    assert.ok(Number(mountainBoundaryLayer.visible_placement_count) > 0, 'viewport should include visible mountain placements')
    assert.ok(
      Number(mountainBoundaryLayer.hard_reserved_cell_count_in_loaded_viewport) > 0,
      'mountain layer should expose translated reservedLocalCells for the loaded viewport',
    )
    assert.equal(
      mountainBoundaryLayer.visual_overhang_only_cells_block_resources,
      false,
      'visualOverhangOnlyCells should not be used as hard resource reservations',
    )
    const firstPlacement = readObject((mountainBoundaryLayer.visible_placements as unknown[])[0])
    assert.ok(Array.isArray(firstPlacement.reservedLocalCells), 'placement should preserve reservedLocalCells')
    assert.ok(Array.isArray(firstPlacement.visualOverhangOnlyCells), 'placement should preserve visualOverhangOnlyCells')
    assert.ok(readObject(firstPlacement.projectionSidePolicy).policyId, 'placement should preserve projectionSidePolicy')
    assert.ok(
      readObject(firstPlacement.resourceExclusion).reservedLocalCellCount,
      'placement should expose resourceExclusion counts',
    )
    const stableOuterPlacement = placementCatalog.find((item) => {
      return readObject(item).line_role === 'stable_direct_outer_contact_boundary_blockade_candidate'
    })
    assert.ok(stableOuterPlacement, 'mountain layer catalog should expose stable-direct outer-contact metadata')
    assert.ok(
      (readObject(stableOuterPlacement).pieceInstances as unknown[]).length <= 5,
      'stable-direct outer contacts should use the fine piece set, not the old four-piece chain',
    )
    const runtimeAssetManifest = readObject(mountainBoundaryLayer.runtime_asset_manifest)
    assert.equal(
      runtimeAssetManifest.runtime_copy_gate,
      'COPIED_TO_FORMAL_RUNTIME_RESOURCE_DIR',
      'mountain runtime adapter should consume copied formal runtime assets, not the v0.37 copy gate directly',
    )
    assert.equal(
      runtimeAssetManifest.asset_root,
      'res://assets/themes/slgclient/current/world/mountains',
      'mountain runtime assets should live under the formal Godot world mountain asset root',
    )
    assert.ok(Number(runtimeAssetManifest.piece_asset_count) >= 26, 'runtime asset manifest should cover the fine piece set')
    assert.equal(
      Number(runtimeAssetManifest.fine_piece_library_added_count),
      10,
      'runtime asset manifest should identify the ten new fine mountain pieces',
    )
    assert.equal(
      runtimeAssetManifest.source_runtime_contract_artifact_id,
      'mountain_barrier_main_world_runtime_contract_v0_47',
      'runtime asset manifest should point at the v0.47 contract artifact',
    )
    assert.ok(Number(mountainBoundaryLayer.render_piece_instance_count) > 0, 'mountain layer should emit renderable piece instances')
    assert.ok(Array.isArray(firstPlacement.render_pieces), 'visible placement should expose render_pieces for Godot drawing')
    const firstRenderPiece = readObject((firstPlacement.render_pieces as unknown[])[0])
    assert.ok(
      typeof firstRenderPiece.asset_path === 'string' &&
        firstRenderPiece.asset_path.startsWith('res://assets/themes/slgclient/current/world/mountains/'),
      'render piece should point at a formal Godot mountain PNG',
    )
    assert.ok(Array.isArray(firstRenderPiece.cell_1km), 'render piece should expose a direct 1km anchor cell')
    assert.ok(Array.isArray(firstRenderPiece.fit_footprint_cells), 'render piece should expose fit footprint cells')
    assert.ok(Array.isArray(firstRenderPiece.source_anchor_px), 'render piece should expose texture anchor pixels')

    const cityGateLayer = readObject(payload.city_gate_anchor_layer)
    const prefabPolicy = readObject(cityGateLayer.prefab_lod_policy)
    assert.equal(prefabPolicy.schema_version, 'east_han_city_gate_prefab_lod_policy_v0_1', 'city/gate prefab LOD policy schema')
    assert.equal(prefabPolicy.asset_manifest_path, 'res://assets/themes/slgclient/current/world/world_cell_assets_manifest_v1.json')
    assert.equal(prefabPolicy.footprint_manifest_path, 'res://assets/themes/slgclient/current/world/world_cell_footprint_manifest_v1.json')
    assert.equal(
      prefabPolicy.accepted_experiment_art_asset_index_path,
      'experiments/east_asia_map_pipeline/generated/accepted_experiment_art_asset_index_v0_1/accepted_experiment_art_asset_index_v0_1.json',
      'city/gate prefab policy should point to the accepted experiment art index',
    )
    const boundaryPlaceholderPolicy = readObject(prefabPolicy.boundary_placeholder_policy)
    assert.equal(
      boundaryPlaceholderPolicy.schema_version,
      'east_han_boundary_placeholder_policy_v0_1',
      'city/gate prefab policy should expose the boundary placeholder contract',
    )
    assert.equal(boundaryPlaceholderPolicy.gate_footprint_id, 'pass_1x1', 'gate placeholder footprint')
    assert.equal(
      boundaryPlaceholderPolicy.mountain_barrier_footprint_id,
      'mountain_barrier_1x1',
      'mountain barrier placeholder footprint',
    )
    assert.equal(boundaryPlaceholderPolicy.gate_blocks_movement, false, 'gate placeholders should remain passable')
    assert.equal(boundaryPlaceholderPolicy.mountain_barrier_blocks_movement, true, 'mountain placeholders should block movement')
    const cityGateObjects = cityGateLayer.visible_objects
    assert.ok(Array.isArray(cityGateObjects), 'city/gate visible objects should be an array')
    assert.ok(cityGateObjects.length > 0, 'city/gate visible objects should exist')
    const cityAnchors = cityGateObjects
      .map((object) => readObject(object))
      .filter((anchor) => ['city', 'player_city', 'ai_city'].includes(String(anchor.kind)))
    const gateAnchors = cityGateObjects.map((object) => readObject(object)).filter((anchor) => anchor.kind === 'gate')
    assert.ok(cityAnchors.length > 0, 'city anchors should exist')
    assert.ok(gateAnchors.length > 0, 'gate anchors should exist as logic placeholders before final gate art is accepted')
    const playerMainCityAnchor = cityGateObjects
      .map((object) => readObject(object))
      .find((anchor) => anchor.kind === 'player_city')
    const aiMainCityAnchor = cityGateObjects.map((object) => readObject(object)).find((anchor) => anchor.kind === 'ai_city')
    assert.ok(playerMainCityAnchor, 'player main city should be emitted as a formal 3x3 main-world anchor')
    assert.ok(aiMainCityAnchor, 'AI main city should be emitted as a formal 3x3 main-world anchor')
    assert.equal(playerMainCityAnchor.footprint_id, 'player_city_3x3_initial', 'player main city footprint')
    assert.equal(aiMainCityAnchor.footprint_id, 'ai_city_3x3_initial', 'AI main city footprint')
    assert.deepEqual(playerMainCityAnchor.footprint_cells, [3, 3], 'player main city footprint cells')
    assert.deepEqual(aiMainCityAnchor.footprint_cells, [3, 3], 'AI main city footprint cells')
    assertAnchorFootprintTileIds(playerMainCityAnchor, 'player main city anchor')
    assertAnchorFootprintTileIds(aiMainCityAnchor, 'AI main city anchor')
    assert.equal(playerMainCityAnchor.prefab_id, 'world_node_city_v1', 'player main city should use accepted 3x3 city prefab')
    assert.equal(aiMainCityAnchor.prefab_id, 'world_node_ai_city_3x3_v1', 'AI main city should use accepted 3x3 city prefab')
    assert.equal(playerMainCityAnchor.owner, 'player', 'player main city owner')
    assert.equal(aiMainCityAnchor.owner, 'enemy', 'AI main city owner')
    assert.equal(playerMainCityAnchor.source_tile_id, 'tile_08', 'player main city should stay linked to scenario home tile')
    assert.equal(aiMainCityAnchor.source_tile_id, 'tile_10', 'AI main city should stay linked to scenario home tile')
    assert.equal(
      playerMainCityAnchor.anchor_delta_source,
      'world_faction_home_city',
      'player main city should come from the formal city/gate anchor delta',
    )
    assert.equal(
      aiMainCityAnchor.anchor_delta_source,
      'world_faction_home_city',
      'AI main city should come from the formal city/gate anchor delta',
    )
    const playerMainCityCell1km = readObject(playerMainCityAnchor.cell_1km)
    const aiMainCityCell1km = readObject(aiMainCityAnchor.cell_1km)
    assert.ok(Number(playerMainCityCell1km.x) >= 0, 'player main city should expose direct 1km cell')
    assert.ok(Number(aiMainCityCell1km.x) >= 0, 'AI main city should expose direct 1km cell')
    assert.equal(
      cityAnchors.some((anchor) => anchor.footprint_id === 'system_city_l03_l04_3x3'),
      false,
      'East Han system city anchors should not consume the player/AI 3x3 city asset',
    )
    assert.ok(
      cityAnchors.some((anchor) => anchor.city_role === 'county_city' && anchor.footprint_id === 'system_city_l05_l06_5x5'),
      'county/system cities should use accepted 5x5 prefab footprint',
    )
    const countySystemCityAnchor = cityAnchors.find(
      (anchor) => anchor.city_role === 'county_city' && anchor.footprint_id === 'system_city_l05_l06_5x5',
    )
    assertAnchorFootprintTileIds(countySystemCityAnchor, 'county/system city anchor')
    assert.ok(
      cityAnchors.some((anchor) => anchor.city_role === 'commandery_seat' && anchor.footprint_id === 'system_city_l07_l08_7x7'),
      'commandery seats should use accepted 7x7 prefab footprint',
    )
    const commanderySeatAnchor = cityAnchors.find(
      (anchor) => anchor.city_role === 'commandery_seat' && anchor.footprint_id === 'system_city_l07_l08_7x7',
    )
    assertAnchorFootprintTileIds(commanderySeatAnchor, 'commandery seat anchor')
    for (const anchor of gateAnchors) {
      assert.equal(anchor.footprint_id, 'pass_1x1', 'gate anchors should use the 1x1 pass footprint')
      assertAnchorFootprintTileIds(anchor, 'gate anchor')
      assert.equal(anchor.logic_placeholder, true, 'gate anchors should be explicit logic placeholders until final art is accepted')
      assert.equal(
        anchor.asset_status,
        'logic_placeholder_until_gate_art_accepted',
        'gate anchors should not pretend to use final accepted gate art',
      )
      assert.equal(anchor.boundary_role, 'state_boundary_passage', 'gate anchors should mark state-boundary passage semantics')
      assert.equal(anchor.blocks_movement, false, 'gate anchors should be pass-through openings')
      assert.equal(anchor.blocks_resource_generation, true, 'gate anchors should reserve their cells from resource generation')
      assert.equal(anchor.draw_layer, 'world_node', 'gate placeholders should stay in the city/gate draw layer')
    }
    for (const object of cityGateObjects.slice(0, 12)) {
      const anchor = readObject(object)
      assert.equal(anchor.runtime_ready, true, 'city/gate anchor should be runtime ready')
      assert.ok(typeof anchor.prefab_id === 'string' && anchor.prefab_id.startsWith('world_node_'), 'city/gate anchor should resolve a runtime prefab')
      assert.ok(typeof anchor.footprint_id === 'string' && anchor.footprint_id.length > 0, 'city/gate anchor should resolve a footprint')
      assert.ok(Array.isArray(anchor.footprint_cells), 'city/gate anchor should expose explicit footprint cells for Godot')
      assert.ok(Array.isArray(anchor.footprint_tile_ids), 'city/gate anchor should expose footprint tile ids for Godot')
      assert.ok(typeof anchor.lod === 'string' && anchor.lod.length > 0, 'city/gate anchor should resolve a LOD')
      assert.equal(anchor.draw_layer, 'world_node', 'city/gate anchors should draw on world_node layer')
      assert.ok(Number.isFinite(Number(anchor.draw_sort_key)), 'city/gate draw sort key should be numeric')
      if (anchor.kind === 'city') {
        assert.equal(
          anchor.accepted_experiment_art_asset_index_path,
          'experiments/east_asia_map_pipeline/generated/accepted_experiment_art_asset_index_v0_1/accepted_experiment_art_asset_index_v0_1.json',
          'city anchors should cite the accepted art asset index',
        )
        assert.ok(
          typeof anchor.asset_path === 'string' &&
            anchor.asset_path.startsWith('res://assets/themes/slgclient/current/world/accepted_experiment_cities/city_'),
          'city anchors should use accepted city raster assets',
        )
      }
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          loadedChunkCount: loadedChunkIds.length,
          selectableCellCount: cellLayer.selectable_cell_count,
          substrateChunkTextureCount: substrateChunkTextures.length,
          resourceSampleCount: resourceObjects.length,
          cityGateVisibleCount: cityGateObjects.length,
        },
        null,
        2,
      ),
    )
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[world_map_layout_main_world_cell_layer_contract] failed:', error)
  process.exitCode = 1
})
