import assert from 'node:assert/strict'
import {
  buildSessionPersistPath,
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
type JsonRecord = Record<string, unknown>

const DEFAULT_LAYERED_QUERY =
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
  '&includeLayers=base_map,main_world_cells,derived_masks,maritime_passability,resource_overlay,city_gate_anchors,cell_overrides,labels'

const TIANXIA_YUTU_QUERY = DEFAULT_LAYERED_QUERY.replace(
  'includeLayers=base_map,main_world_cells,derived_masks,maritime_passability,resource_overlay,city_gate_anchors,cell_overrides,labels',
  'includeLayers=tianxia_yutu_overview,labels',
)

const TIANXIA_YUTU_SCALE_PRESETS = [
  { id: '2k', maxWidth: 2048, maxHeight: 2048 },
  { id: '16k', maxWidth: 16384, maxHeight: 16384 },
] as const

function containsObjectKey(value: unknown, key: string): boolean {
  if (Array.isArray(value)) {
    return value.some((entry) => containsObjectKey(entry, key))
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return Object.prototype.hasOwnProperty.call(record, key) || Object.values(record).some((entry) => containsObjectKey(entry, key))
  }
  return false
}

async function requestJsonWithHeaders(
  baseUrl: string,
  path: string,
  method: 'GET' | 'POST',
  headers: Record<string, string>,
  body?: Record<string, unknown>,
) {
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const raw = await response.text()
  return {
    ok: response.ok,
    status: response.status,
    data: raw.trim() ? JSON.parse(raw) as unknown : null,
  }
}

function assertOverviewLayer(payload: Record<string, unknown>) {
  const layerOrder = payload.layer_order
  assert.ok(Array.isArray(layerOrder), 'layer_order should be an array')
  assert.ok(layerOrder.includes('tianxia_yutu_overview'), 'layer_order should include explicit Tianxia Yutu layer')

  const layer = readObject(payload.tianxia_yutu_overview_layer)
  assert.equal(layer.schema_version, 'east_han_tianxia_yutu_runtime_tile_manifest_v0_1', 'overview layer schema')
  assert.equal(layer.name_zh, '天下舆图', 'overview layer display name')
  assert.equal(layer.runtime_role, 'overview_navigation_qa_preview', 'overview runtime role')
  assert.equal(layer.main_world_substrate, false, 'overview should not become the gameplay substrate')
  assert.deepEqual(layer.base_size_px, [8070, 7390], 'overview base size')
  assert.deepEqual(layer.max_detail_size_px, [16140, 14780], 'overview max detail size')
  const previewImage = readObject(layer.preview_image)
  assert.equal(
    previewImage.path,
    'experiments/east_asia_map_pipeline/generated/east_han_tianxia_yutu_owner_index_boundary_renderer_v0_1/east_han_tianxia_yutu_owner_index_boundary_renderer_v0_1_preview_1600w.png',
    'overview preview image should use the accepted renderer preview',
  )

  const sourcePolicy = readObject(layer.source_policy)
  assert.equal(sourcePolicy.uses_1920_resolved_overlay_as_source, false, 'overview must not use 1920 resolved overlay')
  assert.equal(sourcePolicy.boundary_source, 'owner_index_neighbor_differences', 'overview boundary source')

  const sources = readObject(layer.sources)
  assert.equal(
    readObject(sources.lod0_lod2_renderer).artifact_id,
    'east_han_tianxia_yutu_owner_index_boundary_renderer_v0_1',
    'overview LOD0-L2 source artifact',
  )
  assert.equal(
    readObject(sources.lod3_renderer).artifact_id,
    'east_han_tianxia_yutu_owner_index_boundary_lod3_tiles_v0_1',
    'overview LOD3 source artifact',
  )
  const sourceContractSummary = readObject(layer.source_contract_summary)
  assert.equal(
    sourceContractSummary.schema_version,
    'tianxia_yutu_source_contract_summary_v0_1',
    'overview should expose auditable source contract summary',
  )
  assert.equal(
    sourceContractSummary.runtime_manifest_artifact_id,
    'east_han_tianxia_yutu_runtime_tile_manifest_v0_1',
    'overview source summary should identify the runtime tile manifest',
  )
  assert.equal(sourceContractSummary.runtime_manifest_status, 'runtime_tile_manifest_ready', 'overview source manifest status')
  assert.deepEqual(sourceContractSummary.base_size_px, [8070, 7390], 'overview source summary base size')
  assert.deepEqual(sourceContractSummary.max_detail_size_px, [16140, 14780], 'overview source summary highest detail size')
  assert.equal(sourceContractSummary.current_highest_lod_preset_id, '16k', 'overview should honestly advertise 16K as current highest LOD')
  assert.deepEqual(sourceContractSummary.runtime_preset_ids, ['2k', '16k'], 'overview should expose only supported runtime presets')
  assert.deepEqual(sourceContractSummary.unsupported_preset_ids, ['24k'], 'overview should keep 24K as unsupported/preflight-only')
  assert.equal(sourceContractSummary.no_24k_runtime_asset, true, 'overview should not expose a 24K runtime asset')
  assert.equal(sourceContractSummary.runtime_tile_count, 324, 'overview source summary tile count')
  assert.equal(
    sourceContractSummary.large_scale_policy,
    'rerender_tiles_from_masks_at_target_lod; do_not_upscale_1920_preview',
    'overview source summary should keep the accepted large-scale source policy',
  )
  const sourceFingerprints = readObject(sourceContractSummary.source_fingerprints)
  assert.equal(
    readObject(sourceFingerprints.terrain_8k).path,
    'experiments/east_asia_map_pipeline/generated/high_res_map_candidate_v0_6/high_res_map_candidate_v0_6_composite.png',
    'overview source summary should identify the current 8K terrain source',
  )
  assert.equal(String(readObject(sourceFingerprints.terrain_8k).sha256 ?? '').length, 64, 'terrain source fingerprint should be stable')
  assert.equal(
    readObject(sourceFingerprints.lod3_renderer).artifact_id,
    'east_han_tianxia_yutu_owner_index_boundary_lod3_tiles_v0_1',
    'overview source summary should include the 16K/detail renderer fingerprint',
  )

  const deprecated = layer.deprecated_artifact_ids
  assert.ok(Array.isArray(deprecated), 'deprecated artifact list should exist')
  assert.ok(deprecated.includes('east_han_tianxia_yutu_tile_pyramid_lod0_lod2_v0_2'), 'bad v0_2 tile pyramid should be rejected')
  assert.ok(deprecated.includes('east_han_tianxia_yutu_accepted_overview_source_v0_1'), 'old accepted overview source should be rejected')

  const tileLevels = layer.tile_levels
  assert.ok(Array.isArray(tileLevels), 'tile_levels should be an array')
  assert.deepEqual(tileLevels.map((level) => readObject(level).lod), [0, 1, 2, 3], 'overview LODs')
  assert.equal(layer.tile_count, 324, 'overview tile count')
  const lod3 = readObject(tileLevels.find((level) => readObject(level).lod === 3))
  assert.equal(lod3.tile_count, 240, 'LOD3 tile count')

  const jumpTargets = layer.jump_targets
  assert.ok(Array.isArray(jumpTargets), 'overview jump targets should be an array')
  assert.equal(jumpTargets.length, 202, 'overview jump targets should keep the exact navigation target count after 镇南关 retirement')
  assert.ok(
    jumpTargets.some((target) => readObject(target).label === '洛阳' && readObject(readObject(target).cell_1km).x === 4387),
    'overview jump targets should include Luoyang in 1km cells',
  )
  assert.ok(
    jumpTargets.some((target) => readObject(target).target_scope === 'commandery_seat'),
    'overview jump targets should include commandery seat anchors',
  )
  assert.ok(
    jumpTargets.some((target) => readObject(target).target_scope === 'state_government'),
    'overview jump targets should include state government anchors',
  )
  assert.ok(
    jumpTargets.some((target) => readObject(target).target_scope === 'gate'),
    'overview jump targets should include gate/pass anchors',
  )
  const zhenNanGate = jumpTargets.find((target) => {
    const normalized = readObject(target)
    return normalized.target_scope === 'gate' && normalized.label === '镇南关'
  })
  assert.equal(zhenNanGate, undefined, 'overview jump targets should retire 镇南关')
  const guGuanGate = jumpTargets.find((target) => {
    const normalized = readObject(target)
    return normalized.target_scope === 'gate' && normalized.label === '故关'
  })
  assert.ok(guGuanGate, 'overview jump targets should keep 故关')
  const guGuanGateObject = readObject(guGuanGate)
  const guGuanCell = readObject(guGuanGateObject.cell_1km)
  assert.equal(guGuanCell.x, 3964, '故关 cell x should remain in current accepted gate overlay')
  assert.equal(guGuanCell.y, 3558, '故关 cell y should remain in current accepted gate overlay')
  assert.equal(
    guGuanGateObject.boundary_snap_status,
    'snapped_to_direct_region_adjacency',
    '故关 should expose resolved owner-index boundary snap status',
  )
  assert.equal(
    guGuanGateObject.boundary_pair_key,
    'cmd_auto_145__cmd_auto_148',
    '故关 should expose its accepted from/to region boundary pair',
  )
  assert.ok(
    Number(guGuanGateObject.boundary_direct_edge_pixel_count ?? 0) > 0,
    '故关 should expose a non-empty direct boundary edge sample count',
  )
  const gateTargets = jumpTargets.map((target) => readObject(target)).filter((target) => target.target_scope === 'gate')
  assert.equal(gateTargets.length, 70, 'runtime navigation should expose exactly 70 active gate targets')
  for (const gateTarget of gateTargets) {
    const boundaryStatus = String(gateTarget.boundary_snap_status ?? '').trim()
    assert.notEqual(String(gateTarget.from_state_group_id ?? '').trim(), '', `gate ${String(gateTarget.label ?? '')} should expose from_state_group_id`)
    assert.notEqual(String(gateTarget.to_state_group_id ?? '').trim(), '', `gate ${String(gateTarget.label ?? '')} should expose to_state_group_id`)
    assert.equal(
      boundaryStatus,
      'snapped_to_direct_region_adjacency',
      `gate ${String(gateTarget.label ?? '')} should expose resolved owner-index boundary snap status`,
    )
    if (boundaryStatus === 'snapped_to_direct_region_adjacency') {
      assert.equal(
        String(gateTarget.boundary_snap_basis ?? ''),
        'east_han_resolved_mask_autofix_candidate_v0_1',
        `gate ${String(gateTarget.label ?? '')} should retain the accepted boundary snap basis`,
      )
      assert.notEqual(
        String(gateTarget.boundary_pair_key ?? '').trim(),
        '',
        `gate ${String(gateTarget.label ?? '')} should expose boundary_pair_key`,
      )
      assert.ok(
        Number(gateTarget.boundary_direct_edge_pixel_count ?? 0) > 0,
        `gate ${String(gateTarget.label ?? '')} should expose boundary_direct_edge_pixel_count`,
      )
    }
  }
  const legacyBoundaryGates = gateTargets.filter((target) => target.boundary_snap_status === 'legacy_authoring_without_resolved_boundary_snap')
  assert.deepEqual(
    legacyBoundaryGates.map((target) => String(target.label ?? '')).sort(),
    [],
    'all active gate targets should be upgraded to resolved owner-index boundary snap semantics',
  )
  const duplicateGateNameGroups = new Map<string, JsonRecord[]>()
  for (const gateTarget of gateTargets) {
    const originalName = String(gateTarget.original_gate_name ?? gateTarget.label ?? '').trim()
    if (originalName === '') {
      continue
    }
    const group = duplicateGateNameGroups.get(originalName) ?? []
    group.push(gateTarget)
    duplicateGateNameGroups.set(originalName, group)
  }
  const duplicateGateNavigationLabels = new Map<string, string[]>()
  for (const [originalName, targets] of duplicateGateNameGroups.entries()) {
    if (targets.length <= 1) {
      continue
    }
    duplicateGateNavigationLabels.set(
      originalName,
      targets.map((target) => String(target.navigation_label ?? '').trim()).sort(),
    )
    for (const target of targets) {
      assert.equal(target.label, originalName, `duplicate gate ${originalName} should keep the map marker short label`)
      assert.equal(target.duplicate_gate_name, true, `duplicate gate ${originalName} should expose duplicate_gate_name=true`)
      assert.notEqual(String(target.navigation_label ?? '').trim(), originalName, `duplicate gate ${originalName} should expose disambiguated navigation_label`)
      assert.ok(
        String(target.navigation_label ?? '').includes(String(target.from_region_label ?? '').trim()) ||
          String(target.navigation_label ?? '').includes(String(target.to_region_label ?? '').trim()),
        `duplicate gate ${originalName} navigation_label should include an adjacent region label`,
      )
    }
  }
  assert.deepEqual(
    Array.from(duplicateGateNavigationLabels.keys()).sort(),
    ['大散关', '阳泉'],
    'current duplicate gate names should remain audited until seed-level name review resolves them',
  )
  for (const [originalName, labels] of duplicateGateNavigationLabels.entries()) {
    assert.equal(new Set(labels).size, labels.length, `duplicate gate ${originalName} navigation labels should be unique`)
  }
  const zhiGuanGate = gateTargets.find((target) => target.source_gate_id === 'gate_003')
  assert.ok(zhiGuanGate, 'runtime navigation should keep gate_003 after stable name correction')
  assert.equal(zhiGuanGate?.label, '轵关', 'gate_003 should be corrected from 延津 to 轵关 at stable seed level')
  assert.equal(zhiGuanGate?.original_gate_name, '轵关', 'gate_003 original gate name should reflect the stable corrected seed name')
  assert.equal(zhiGuanGate?.duplicate_gate_name, false, 'gate_003 should no longer be treated as a duplicate 延津 gate')

  const chokepointMetadataConsumer = readObject(layer.main_world_chokepoint_metadata_consumer)
  assert.equal(
    chokepointMetadataConsumer.schema_version,
    'tianxia_yutu_chokepoint_metadata_consumer_v0_1',
    'Tianxia Yutu should expose a metadata-only main-world chokepoint consumer contract',
  )
  assert.equal(
    chokepointMetadataConsumer.source_metadata_contract_version,
    'main_world_chokepoint_metadata_v0_1',
    'Tianxia Yutu metadata consumer should point to the main-world chokepoint metadata contract',
  )
  assert.equal(
    chokepointMetadataConsumer.render_policy,
    'metadata_only_do_not_load_or_draw_main_world_pass_wall_sprite',
    'Tianxia Yutu metadata consumer must not load or draw main-world pass-wall sprites',
  )
  const chokepointMetadataNodes = chokepointMetadataConsumer.nodes
  assert.ok(Array.isArray(chokepointMetadataNodes), 'Tianxia Yutu chokepoint metadata nodes should be an array')
  assert.ok(Number(chokepointMetadataConsumer.node_count) > 0, 'Tianxia Yutu should receive non-rendering chokepoint metadata')
  assert.equal(
    Number(chokepointMetadataConsumer.node_count),
    chokepointMetadataNodes.length,
    'Tianxia Yutu chokepoint metadata node_count should match nodes length',
  )
  const zhiGuanChokepointMetadata = chokepointMetadataNodes
    .map((node) => readObject(node))
    .find((node) => node.gate_id === 'gate_003')
  assert.ok(zhiGuanChokepointMetadata, 'Tianxia Yutu should receive metadata for gate_003 formal pass-wall')
  assert.equal(zhiGuanChokepointMetadata?.gate_name, '轵关', 'metadata-only consumer should preserve gate name')
  assert.equal(zhiGuanChokepointMetadata?.formal_chokepoint, true, 'metadata-only consumer should mark formal chokepoint')
  assert.equal(zhiGuanChokepointMetadata?.formal_pass_wall, true, 'metadata-only consumer should mark formal pass-wall')
  assert.equal(
    zhiGuanChokepointMetadata?.source_artifact_id,
    'mountain_barrier_contested_chokepoint_contract_v0_31',
    'metadata-only consumer should expose source artifact id without loading its sprite',
  )
  const zhiGuanWorldCoordinate = readObject(zhiGuanChokepointMetadata?.world_coordinate)
  assert.equal(
    zhiGuanWorldCoordinate.coordinate_space,
    'real_map_data_1km.cell_1km',
    'metadata-only consumer should expose the world coordinate space',
  )
  assert.deepEqual(readObject(zhiGuanWorldCoordinate.cell_1km), { x: 4413, y: 2423 }, 'metadata-only consumer should expose gate_003 coordinate')
  assert.equal(
    readObject(readObject(zhiGuanChokepointMetadata?.adjacent_states).from).id,
    'bingzhou',
    'metadata-only consumer should expose from state',
  )
  assert.equal(
    readObject(readObject(zhiGuanChokepointMetadata?.adjacent_states).to).id,
    'sili',
    'metadata-only consumer should expose to state',
  )
  assert.equal(
    readObject(readObject(zhiGuanChokepointMetadata?.adjacent_commanderies).from).label,
    '上党郡',
    'metadata-only consumer should expose from commandery',
  )
  assert.equal(
    readObject(readObject(zhiGuanChokepointMetadata?.adjacent_commanderies).to).label,
    '河内郡',
    'metadata-only consumer should expose to commandery',
  )
  const overviewLayerJson = JSON.stringify(layer)
  assert.equal(
    overviewLayerJson.includes('main_world_chokepoint_pass_wall_east_west_no_basepad_master_v0_31.png'),
    false,
    'Tianxia Yutu overview payload must not include the main-world pass-wall sprite asset path',
  )
  assert.equal(
    overviewLayerJson.includes('pass_wall_master_v0_31'),
    false,
    'Tianxia Yutu overview payload must not include main-world pass-wall render piece ids',
  )
  assert.equal(
    containsObjectKey(layer, 'render_pieces'),
    false,
    'Tianxia Yutu overview payload must not expose main-world render_pieces',
  )
  const expectedJiaozhouBoundaryGates = [
    ['梅关', 'jiaozhou', 'jingzhou'],
    ['郁水', 'yangzhou', 'jiaozhou'],
    ['红河', 'yizhou', 'jiaozhou'],
    ['定南', 'yangzhou', 'jiaozhou'],
    ['故关', 'yizhou', 'jiaozhou'],
  ] as const
  for (const [label, fromState, toState] of expectedJiaozhouBoundaryGates) {
    const gateTarget = gateTargets.find((target) => target.label === label)
    assert.ok(gateTarget, `runtime navigation should keep ${label}`)
    assert.equal(gateTarget?.from_state_group_id, fromState, `${label} should expose accepted from_state_group_id`)
    assert.equal(gateTarget?.to_state_group_id, toState, `${label} should expose accepted to_state_group_id`)
    assert.equal(gateTarget?.cross_state_group, true, `${label} should remain cross-state boundary semantics`)
  }

  const navigationFacets = readObject(layer.navigation_facets)
  assert.equal(navigationFacets.schema_version, 'tianxia_yutu_navigation_facets_v0_1', 'navigation facets schema')
  const targetScopeCounts = readObject(navigationFacets.target_scope_counts)
  assert.equal(Number(targetScopeCounts.commandery_seat ?? 0), 105, 'navigation facets should count commandery seats exactly')
  assert.equal(Number(targetScopeCounts.state_government ?? 0), 13, 'navigation facets should count state government jump anchors exactly')
  assert.equal(Number(targetScopeCounts.gate ?? 0), 70, 'navigation facets should count gate anchors exactly after 镇南关 retirement')
  const filterGroups = navigationFacets.filter_groups
  assert.ok(Array.isArray(filterGroups), 'navigation filter groups should be an array')
  assert.ok(
    filterGroups.some((group) => readObject(group).id === 'gate'),
    'navigation filter groups should expose gate filtering',
  )
  const cityMarkers = layer.city_markers
  assert.ok(Array.isArray(cityMarkers), 'overview should expose ordinary city markers outside jump target navigation')
  assert.equal(cityMarkers.length, 539, 'overview should keep every accepted city marker available for high-zoom drawing')

  const administrativeLayer = readObject(layer.administrative_ownership_layer)
  assert.equal(
    administrativeLayer.schema_version,
    'tianxia_yutu_administrative_ownership_layer_v0_1',
    'administrative ownership layer schema',
  )
  assert.ok(Number(administrativeLayer.state_count ?? 0) >= 10, 'administrative layer should include states')
  assert.ok(Number(administrativeLayer.region_count ?? 0) >= 100, 'administrative layer should include commanderies')
  assert.ok(Array.isArray(administrativeLayer.states), 'administrative layer should expose state summaries')
  assert.ok(Array.isArray(administrativeLayer.regions), 'administrative layer should expose region summaries')
  const stateRegionIndex = readObject(administrativeLayer.state_region_index)
  const drilldown = readObject(administrativeLayer.drilldown)
  assert.equal(drilldown.default_level, 'state', 'administrative drilldown should start at state level')
  assert.equal(drilldown.next_level, 'region', 'administrative drilldown should drill from state to region')
  assert.ok(Object.keys(stateRegionIndex).length >= 10, 'administrative layer should expose state -> commandery index')
  for (const [stateKey, rawEntry] of Object.entries(stateRegionIndex)) {
    const entry = readObject(rawEntry)
    assert.notEqual(String(stateKey).trim(), '', 'state_region_index keys should be stable and non-empty')
    assert.notEqual(String(entry.state_id ?? '').trim(), '', `state ${stateKey} should expose a stable non-empty state_id`)
    const indexedRegions = Array.isArray(entry.regions) ? entry.regions : []
    assert.ok(indexedRegions.length > 0, `state ${stateKey} should expose drilldown regions`)
    for (const rawRegion of indexedRegions) {
      const region = readObject(rawRegion)
      assert.notEqual(String(region.region_id ?? '').trim(), '', `state ${stateKey} region should expose region_id`)
      assert.notEqual(String(region.state_id ?? '').trim(), '', `region ${String(region.region_id ?? '')} should expose stable state_id`)
      assert.equal(String(region.state_id ?? '').trim(), String(entry.state_id ?? '').trim(), `region ${String(region.region_id ?? '')} should match parent state_id`)
    }
  }
  const serializedAdministrativeLayer = JSON.stringify(administrativeLayer)
  assert.equal(serializedAdministrativeLayer.includes('外圈未定区'), false, 'administrative layer should not expose 外圈未定区 placeholder labels')
  assert.equal(serializedAdministrativeLayer.includes('外围未定区'), false, 'administrative layer should not expose 外围未定区 placeholder labels')
  const indexedStateWithRegions = Object.values(stateRegionIndex).find((entry) => {
    const normalized = readObject(entry)
    return Array.isArray(normalized.region_ids) && normalized.region_ids.length >= 2
  })
  assert.ok(indexedStateWithRegions, 'at least one state should index multiple commanderies for drilldown')

  const adminFocusMaskLayer = readObject(layer.admin_focus_mask_layer)
  assert.equal(
    adminFocusMaskLayer.schema_version,
    'tianxia_yutu_admin_focus_mask_layer_v0_1',
    'administrative focus mask layer schema',
  )
  assert.equal(adminFocusMaskLayer.status, 'ready', 'administrative focus mask layer should be ready')
  assert.equal(
    adminFocusMaskLayer.manifest_status,
    'admin_focus_masks_ready_full',
    'administrative focus mask manifest should be the full asset-mask build',
  )
  assert.equal(
    adminFocusMaskLayer.artifact_id,
    'east_han_tianxia_yutu_admin_focus_masks_v0_1',
    'administrative focus masks should come from the owner-index asset artifact',
  )
  assert.ok(
    String(adminFocusMaskLayer.asset_focus_policy ?? '').includes('no_runtime_hull_when_mask_available'),
    'administrative focus mask layer should prefer asset masks over runtime hulls',
  )
  const adminFocusMasks = adminFocusMaskLayer.masks
  assert.ok(Array.isArray(adminFocusMasks), 'administrative focus mask layer should expose masks')
  const stateMaskById = new Map<string, JsonRecord>()
  const regionMaskById = new Map<string, JsonRecord>()
  for (const rawMask of adminFocusMasks) {
    const mask = readObject(rawMask)
    const scope = String(mask.scope ?? '').trim()
    if (scope === 'state') {
      stateMaskById.set(String(mask.state_id ?? '').trim(), mask)
    }
    if (scope === 'region') {
      regionMaskById.set(String(mask.region_id ?? '').trim(), mask)
    }
  }
  assert.equal(
    Number(adminFocusMaskLayer.state_mask_count ?? 0),
    Number(administrativeLayer.state_count ?? 0),
    'administrative focus masks should cover every state',
  )
  assert.equal(
    Number(adminFocusMaskLayer.region_mask_count ?? 0),
    Number(administrativeLayer.region_count ?? 0),
    'administrative focus masks should cover every commandery/region',
  )
  const maskHealth = readObject(adminFocusMaskLayer.asset_health_summary)
  assert.equal(
    maskHealth.schema_version,
    'tianxia_yutu_admin_focus_mask_asset_health_v0_1',
    'administrative focus mask layer should expose an auditable asset health summary',
  )
  assert.equal(maskHealth.coverage_status, 'full_asset_coverage', 'administrative focus masks should report full asset coverage')
  assert.equal(maskHealth.runtime_hull_fallback_active, false, 'ready focus masks should not activate runtime hull fallback')
  assert.equal(Number(maskHealth.mask_count ?? 0), adminFocusMasks.length, 'focus mask health count should match masks')
  assert.equal(Number(maskHealth.state_mask_count ?? 0), Number(administrativeLayer.state_count ?? 0), 'focus mask health state coverage')
  assert.equal(Number(maskHealth.region_mask_count ?? 0), Number(administrativeLayer.region_count ?? 0), 'focus mask health region coverage')
  assert.equal(Number(maskHealth.missing_png_path_count ?? 0), 0, 'focus mask health should report no missing PNG paths')
  assert.equal(Number(maskHealth.missing_preview_path_count ?? 0), 0, 'focus mask health should report no missing preview PNG paths')
  assert.equal(Number(maskHealth.zero_pixel_mask_count ?? 0), 0, 'focus mask health should report no zero-pixel masks')
  assert.deepEqual(maskHealth.base_size_px, [8070, 7390], 'focus mask health should record the mask base size')
  for (const rawState of administrativeLayer.states as unknown[]) {
    const state = readObject(rawState)
    const stateId = String(state.state_id ?? '').trim()
    const mask = stateMaskById.get(stateId)
    assert.ok(mask, `administrative focus masks should include state ${stateId}`)
    assert.ok(String(mask?.path ?? '').endsWith('.png'), `state ${stateId} mask should reference a PNG`)
  }
  for (const rawRegion of administrativeLayer.regions as unknown[]) {
    const region = readObject(rawRegion)
    const regionId = String(region.region_id ?? '').trim()
    const regionStateId = String(region.state_id ?? '').trim()
    const mask = regionMaskById.get(regionId)
    assert.ok(mask, `administrative focus masks should include region ${regionId}`)
    assert.equal(String(mask?.state_id ?? '').trim(), regionStateId, `region ${regionId} mask should match parent state`)
    assert.ok(String(mask?.path ?? '').endsWith('.png'), `region ${regionId} mask should reference a PNG`)
  }
  assert.ok(
    adminFocusMasks.some((mask) => {
      const normalized = readObject(mask)
      return normalized.scope === 'state' && normalized.state_id === 'jiaozhou' && String(normalized.path ?? '').endsWith('.png')
    }),
    'administrative focus masks should include a Jiao province asset mask',
  )
  assert.ok(
    adminFocusMasks.some((mask) => {
      const normalized = readObject(mask)
      return normalized.scope === 'region' && normalized.region_id === 'cmd_auto_148' && String(normalized.path ?? '').endsWith('.png')
    }),
    'administrative focus masks should include a Cangwu commandery asset mask',
  )

  const factionColorLayer = readObject(layer.faction_color_layer)
  assert.equal(factionColorLayer.schema_version, 'tianxia_yutu_faction_color_layer_v0_1', 'faction color layer schema')
  assert.equal(
    factionColorLayer.color_mode,
    'runtime_player_nation_color_over_administrative_neutral_base',
    'faction colors should be a runtime overlay over neutral administrative ownership',
  )
  const playerNationColorPolicy = readObject(factionColorLayer.player_nation_color_policy)
  assert.equal(
    playerNationColorPolicy.editable_by_player_after_nation_founding,
    false,
    'player nation color should be locked after founding',
  )
  assert.equal(
    playerNationColorPolicy.change_requires,
    'capital_migration_reselects_capital_name_and_color',
    'player nation color should require capital migration to change',
  )
  assert.equal(
    playerNationColorPolicy.source,
    'future_player_founded_nation_profile',
    'player nation color source should stay in the founded-nation profile, not the map panel',
  )

  const strategicOverlayLayer = readObject(layer.strategic_overlay_layer)
  assert.equal(
    strategicOverlayLayer.schema_version,
    'tianxia_yutu_strategic_overlay_layer_v0_1',
    'strategic overlay layer schema',
  )
  const overlays = strategicOverlayLayer.overlays
  assert.ok(Array.isArray(overlays), 'strategic overlays should be an array')
  for (const expectedOverlayId of ['administrative_ownership', 'faction_colors', 'resource_points', 'frontiers', 'gate_markers']) {
    assert.ok(
      overlays.some((overlay) => readObject(overlay).id === expectedOverlayId),
      `strategic overlays should expose ${expectedOverlayId}`,
  )
}

  const resourceOverlay = readObject(overlays.find((overlay) => readObject(overlay).id === 'resource_points'))
  const frontierOverlay = readObject(overlays.find((overlay) => readObject(overlay).id === 'frontiers'))
  const gateOverlay = readObject(overlays.find((overlay) => readObject(overlay).id === 'gate_markers'))
  assert.equal(resourceOverlay.default_visible, false, 'resource points should start opt-in')
  assert.equal(frontierOverlay.default_visible, false, 'frontiers should start opt-in')
  assert.equal(gateOverlay.default_visible, false, 'gate markers should start opt-in for high-zoom/search interaction')
	assert.ok(String(resourceOverlay.product_meaning ?? '').includes('资源'), 'resource overlay should describe product meaning')
	assert.ok(String(frontierOverlay.product_meaning ?? '').includes('战线'), 'frontier overlay should describe product meaning')
	assert.ok(
		String(frontierOverlay.product_meaning ?? '').includes('完整十三州金色州界已烘焙'),
		'frontier overlay should declare that full gold state boundaries are baked into the overview source',
	)
	assert.ok(String(frontierOverlay.product_meaning ?? '').includes('青色外圈'), 'frontier overlay should include cyan outer boundary bands')

	const stateBoundaryPolicy = readObject(strategicOverlayLayer.state_boundary_segment_policy)
	assert.equal(
		stateBoundaryPolicy.state_boundary_source,
		'owner_index_state_adjacency_between_13_east_han_states',
		'full state boundaries should come from owner-index state adjacency',
	)
	assert.equal(
		stateBoundaryPolicy.render_overlay_id,
		'administrative_ownership',
		'full state boundaries should be baked into the administrative ownership layer',
	)
	assert.equal(
		stateBoundaryPolicy.visual_role,
		'baked_full_owner_index_state_adjacency_gold_boundaries',
		'state boundary policy should advertise baked full gold boundaries',
	)
	assert.equal(
		stateBoundaryPolicy.runtime_overlay_policy,
		'legacy_36_short_state_boundary_segments_suppressed',
		'the old short state-boundary segments should be suppressed at runtime',
	)
	assert.equal(
		stateBoundaryPolicy.navigation_policy,
		'not_a_new_navigation_system; coordinate click and existing jump_targets remain authoritative',
    'state boundary segments should reuse the existing Tianxia Yutu navigation and coordinate-click system',
	)
	assert.equal(
		stateBoundaryPolicy.main_world_asset_policy,
		'main_world_consumes_mountain_boundary_assets_separately; Tianxia Yutu full gold state boundaries are baked into the overview source',
		'Tianxia Yutu should not become the mountain-asset runtime layer',
	)
	const stateBoundarySegments = strategicOverlayLayer.state_boundary_segments
	assert.ok(Array.isArray(stateBoundarySegments), 'strategic overlay should expose state boundary segment field')
	assert.equal(stateBoundarySegments.length, 0, 'runtime overlay should not expose the legacy short state-boundary segments')
	const suppressedStateBoundarySegmentsV2 = strategicOverlayLayer.suppressed_state_boundary_segments
	assert.ok(
		Array.isArray(suppressedStateBoundarySegmentsV2),
		'strategic overlay should expose the replacement suppressed state boundary segment audit field',
	)
	assert.equal(
		suppressedStateBoundarySegmentsV2.length,
		36,
		'Tianxia Yutu should expose the replacement audit field for the 36 suppressed short state-to-state boundary segments',
	)
	assert.equal(
		Object.prototype.hasOwnProperty.call(strategicOverlayLayer, 'legacy_state_boundary_segments_suppressed'),
		false,
		'strategic overlay payload should no longer expose legacy_state_boundary_segments_suppressed after replacement migration',
	)
	assert.equal(
		suppressedStateBoundarySegmentsV2.length,
		36,
		'Tianxia Yutu should explicitly suppress the 36 legacy short state-to-state boundary segments',
	)
	assert.ok(
		!jumpTargets.some((target) => readObject(target).target_scope === 'state_boundary_segment'),
		'gold state boundary lines should not create a new jump target scope',
  )

  const outerBoundaryPolicy = readObject(strategicOverlayLayer.outer_boundary_segment_policy)
  assert.equal(
    outerBoundaryPolicy.navigation_policy,
    'not_a_new_navigation_system; coordinate click and existing jump_targets remain authoritative',
    'outer boundary hints should reuse the existing Tianxia Yutu navigation and coordinate-click system',
  )
  assert.equal(
    outerBoundaryPolicy.point_order_policy,
    'sample_band_no_straight_polyline_for_unordered_outer_contact_samples',
    'outer boundary hints should render unordered source samples as a continuous sample band, not straight-line chords',
  )
  assert.equal(
    outerBoundaryPolicy.visual_role,
    'cyan_outer_contact_boundary_continuous_line_band',
    'outer boundary policy should advertise the cyan continuous line-band treatment',
  )
  const outerBoundarySegments = strategicOverlayLayer.outer_boundary_segments
  assert.ok(Array.isArray(outerBoundarySegments), 'strategic overlay should expose cyan outer boundary segments')
  assert.equal(outerBoundarySegments.length, 50, 'Tianxia Yutu should expose the 50 accepted outer-contact boundary hints')
  const sampleOuterBoundarySegment = readObject(outerBoundarySegments[0])
  assert.equal(sampleOuterBoundarySegment.render_overlay_id, 'frontiers', 'outer boundaries should reuse the existing frontiers overlay')
  assert.equal(
    sampleOuterBoundarySegment.tianxia_yutu_visual_role,
    'cyan_outer_contact_boundary_continuous_line_band',
    'outer boundaries should render as cyan continuous line-band hints',
  )
  assert.equal(sampleOuterBoundarySegment.render_mode, 'continuous_sample_band', 'outer boundary render mode should be a continuous sample band')
  assert.deepEqual(sampleOuterBoundarySegment.line_rgb, [80, 235, 245], 'outer boundary line color should match the v0.45 cyan')
  assert.equal(sampleOuterBoundarySegment.main_world_substrate, false, 'outer boundaries should not make Tianxia Yutu the main-world substrate')
  assert.equal(sampleOuterBoundarySegment.creates_jump_target, false, 'outer boundary hints should not create a second navigation target type')
  assert.equal(sampleOuterBoundarySegment.asset_policy, 'no_mountain_asset_in_tianxia_yutu', 'Tianxia Yutu should not carry outer mountain sprites')
  assert.equal(
    sampleOuterBoundarySegment.point_order_policy,
    'sample_band_no_straight_polyline_for_unordered_outer_contact_samples',
    'outer boundary hints should keep unordered samples out of straight polyline rendering',
  )
  const samplePointCloud = sampleOuterBoundarySegment.cell_1km_point_cloud
  assert.ok(Array.isArray(samplePointCloud), 'outer boundary segment should expose drawable 1km-cell points')
  assert.ok(samplePointCloud.length >= 2, 'outer boundary segment point cloud should have at least two points')
  assert.ok(
    !jumpTargets.some((target) => readObject(target).target_scope === 'outer_boundary_segment'),
    'gold outer boundary hints should not create a new jump target scope',
  )
  assert.ok(
    outerBoundarySegments.some((segment) => {
      const item = readObject(segment)
      return (
        item.segment_id === 'stable_commandery_boundary_segment_0150' &&
        item.acceptance_source === 'v0_47_runtime_outer_contact_placement' &&
        String(item.runtime_placement_id ?? '').includes('main_world_mountain_boundary_v0_47_outer_contact_')
      )
    }),
    'D30 short outer contact should be formally promoted through the v0.47 runtime placement contract',
	)
	const counts = readObject(strategicOverlayLayer.counts)
	assert.equal(counts.state_boundary_segment_count, 0, 'runtime state boundary segment count should stay suppressed')
	assert.equal(
		counts.legacy_state_boundary_segment_count_suppressed,
		36,
		'suppressed legacy state boundary count should remain auditable',
	)
	assert.equal(counts.outer_boundary_segment_count, 50, 'outer boundary count should include D30 manual acceptance')
	assert.equal(counts.frontier_boundary_total_count, 50, 'frontiers should include only the outer boundary hints at runtime')
}

function assertTianxiaYutuScalePreset(payload: Record<string, unknown>, expectedPreset: typeof TIANXIA_YUTU_SCALE_PRESETS[number]) {
  const layer = readObject(payload.tianxia_yutu_overview_layer)
  const scalePreset = readObject(layer.scale_preset)
  const scaleCatalog = layer.scale_preset_catalog
  assert.equal(scalePreset.id, expectedPreset.id, `scale preset ${expectedPreset.id} should be active`)
  assert.equal(scalePreset.requested_preset_id, expectedPreset.id, `scale preset ${expectedPreset.id} requested id`)
  assert.equal(scalePreset.resolved_preset_id, expectedPreset.id, `scale preset ${expectedPreset.id} resolved id`)
  assert.equal(scalePreset.fallback_preset_id, '16k', 'scale preset fallback should remain 16k')
  assert.equal(scalePreset.fallback_reason, '', `scale preset ${expectedPreset.id} should not fallback`)
  assert.equal(
    scalePreset.invalid_preset_fallback_policy,
    'fallback_to_16k_without_exposing_24k',
    'invalid Tianxia scale presets should fallback without exposing 24k',
  )
  assert.equal(scalePreset.coordinate_space, COORDINATE_SPACE, 'scale preset should remain in 1km cell coordinate space')
  assert.equal(scalePreset.max_width_px, expectedPreset.maxWidth, `scale preset ${expectedPreset.id} width`)
  assert.equal(scalePreset.max_height_px, expectedPreset.maxHeight, `scale preset ${expectedPreset.id} height`)
  assert.equal(scalePreset.main_world_substrate, false, 'scale preset must not become main-world substrate')
  assert.equal(scalePreset.unit_view_layer_policy, 'not_used_by_tianxia_yutu_overview', 'scale preset must not touch UnitViewLayer')
  assert.ok(Array.isArray(scaleCatalog), 'scale preset catalog should be exposed')
  assert.ok(
    scaleCatalog.some((entry) => readObject(entry).id === '2k') &&
      scaleCatalog.some((entry) => readObject(entry).id === '16k') &&
      !scaleCatalog.some((entry) => readObject(entry).id === '24k'),
    'scale preset catalog should expose 2k/16k only',
  )
}

function assertTianxiaYutuInvalidScalePresetFallback(payload: Record<string, unknown>) {
  const layer = readObject(payload.tianxia_yutu_overview_layer)
  const scalePreset = readObject(layer.scale_preset)
  const scaleCatalog = layer.scale_preset_catalog
  assert.equal(scalePreset.id, '16k', 'invalid Tianxia scale preset should resolve to 16k')
  assert.equal(scalePreset.requested_preset_id, '24k', 'invalid Tianxia scale preset should preserve requested id')
  assert.equal(scalePreset.resolved_preset_id, '16k', 'invalid Tianxia scale preset should report resolved id')
  assert.equal(scalePreset.fallback_preset_id, '16k', 'invalid Tianxia scale preset should fallback to 16k')
  assert.equal(scalePreset.fallback_reason, 'unsupported_preset', 'invalid Tianxia scale preset should report fallback reason')
  assert.equal(
    scalePreset.invalid_preset_fallback_policy,
    'fallback_to_16k_without_exposing_24k',
    'invalid Tianxia scale preset fallback policy',
  )
  assert.ok(Array.isArray(scaleCatalog), 'scale preset catalog should be exposed for invalid requests')
  assert.ok(!scaleCatalog.some((entry) => readObject(entry).id === '24k'), 'invalid 24k request must not expose 24k catalog entry')
}

function assertFrontlineMarker(payload: Record<string, unknown>) {
  const layer = readObject(payload.tianxia_yutu_overview_layer)
  const strategicOverlayLayer = readObject(layer.strategic_overlay_layer)
  const frontlineMarkers = strategicOverlayLayer.frontline_markers
  assert.ok(Array.isArray(frontlineMarkers), 'strategic overlay should expose alliance frontline markers')
  const marker = frontlineMarkers.find((item) => readObject(item).id === 'frontline_marker_luoyang_push_v1')
  assert.ok(marker, 'frontline marker should be visible in Tianxia overview overlay')
  const markerObject = readObject(marker)
  assert.equal(markerObject.label, '洛阳推进线', 'frontline marker label')
  assert.equal(markerObject.faction_id, 'player', 'frontline marker faction')
  assert.equal(markerObject.authority_source, 'alliance_officer_main_world_marker', 'frontline marker source')
  assert.equal(markerObject.actor_commander_id, 'ally_west', 'frontline marker should record officer commander id')
  assert.equal(markerObject.actor_commander_name, '河东盟军', 'frontline marker should record officer commander name')
  assert.equal(markerObject.authority_role, 'alliance_commander', 'frontline marker should record authority role')
  assert.equal(markerObject.authority_grant_id, 'grant_player_frontline_commander', 'frontline marker should record authority grant')
  assert.equal(markerObject.actor_session_id_type, 'player_session', 'frontline marker should record session authority type')
  assert.equal(markerObject.actor_player_name, '验收官员', 'frontline marker should record player name')
  assert.equal(markerObject.visibility, 'alliance', 'frontline marker visibility')
  assert.deepEqual(readObject(markerObject.from_cell), { x: 4300, y: 2460 }, 'frontline marker from cell')
  assert.deepEqual(readObject(markerObject.to_cell), { x: 4387, y: 2482 }, 'frontline marker to cell')
}

function assertRuntimeNationColor(
  payload: Record<string, unknown>,
  expectedNationName = '青州试立国',
  expectedColorHex = '#3f7fbf',
  expectedCapitalTileId = 'tile_08',
) {
  const layer = readObject(payload.tianxia_yutu_overview_layer)
  const factionColorLayer = readObject(layer.faction_color_layer)
  const entries = factionColorLayer.current_runtime_color_entries
  assert.ok(Array.isArray(entries), 'faction color layer should expose runtime color entries')
  const playerEntry = entries.find((item) => readObject(item).faction_id === 'player')
  assert.ok(playerEntry, 'player founded nation color should be visible in runtime color entries')
  const entry = readObject(playerEntry)
  assert.equal(entry.nation_name, expectedNationName, 'runtime color entry nation name')
  assert.equal(entry.color_hex, expectedColorHex, 'runtime color entry color')
  assert.equal(entry.source, 'nation_profile', 'runtime color source')
  assert.equal(entry.capital_tile_id, expectedCapitalTileId, 'runtime color entry should expose nation capital tile')
  assert.equal(entry.capital_name, '青石城', 'runtime color entry should expose nation capital name')
}

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('world_map_layout_tianxia_yutu_overview_session_state'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const defaultResponse = await requestJson(baseUrl, DEFAULT_LAYERED_QUERY, 'GET')
    assert.equal(defaultResponse.status, 200, `default layered map-layout failed: ${JSON.stringify(defaultResponse.data)}`)
    const defaultPayload = readObject(defaultResponse.data)
    assert.equal(defaultPayload.tianxia_yutu_overview_layer, undefined, 'normal gameplay layered query should not include Tianxia Yutu')

    const overviewResponse = await requestJson(baseUrl, TIANXIA_YUTU_QUERY, 'GET')
    assert.equal(overviewResponse.status, 200, `overview layered map-layout failed: ${JSON.stringify(overviewResponse.data)}`)
    assertOverviewLayer(readObject(overviewResponse.data))

    for (const preset of TIANXIA_YUTU_SCALE_PRESETS) {
      const presetResponse = await requestJson(
        baseUrl,
        `${TIANXIA_YUTU_QUERY}&tianxiaYutuScalePreset=${encodeURIComponent(preset.id)}`,
        'GET',
      )
      assert.equal(presetResponse.status, 200, `overview ${preset.id} preset failed: ${JSON.stringify(presetResponse.data)}`)
      assertTianxiaYutuScalePreset(readObject(presetResponse.data), preset)
    }

    const invalidPresetResponse = await requestJson(
      baseUrl,
      `${TIANXIA_YUTU_QUERY}&tianxiaYutuScalePreset=24k`,
      'GET',
    )
    assert.equal(invalidPresetResponse.status, 200, `overview invalid preset fallback failed: ${JSON.stringify(invalidPresetResponse.data)}`)
    assertTianxiaYutuInvalidScalePresetFallback(readObject(invalidPresetResponse.data))

    const sessionJoinResponse = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: '验收官员',
    })
    assert.equal(sessionJoinResponse.status, 200, `session join failed: ${JSON.stringify(sessionJoinResponse.data)}`)
    const sessionToken = String(readObject(sessionJoinResponse.data).token ?? '')
    assert.ok(sessionToken.length >= 32, 'session join should return a bearer token')

    const ordinarySessionJoinResponse = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: '普通成员',
    })
    assert.equal(ordinarySessionJoinResponse.status, 200, `ordinary session join failed: ${JSON.stringify(ordinarySessionJoinResponse.data)}`)
    const ordinarySessionToken = String(readObject(ordinarySessionJoinResponse.data).token ?? '')
    assert.ok(ordinarySessionToken.length >= 32, 'ordinary session join should return a bearer token')

    const missingAuthorityFrontlineResponse = await requestJson(
      baseUrl,
      '/api/world/action?includeWorld=false',
      'POST',
      {
        action: 'updateAllianceFrontlineMarker',
        payload: {
          markerId: 'frontline_marker_luoyang_push_v1',
          factionId: 'player',
          label: '洛阳推进线',
          fromCell: { x: 4300, y: 2460 },
          toCell: { x: 4387, y: 2482 },
          note: '缺少官员权限，应该被拒绝。',
          visibility: 'alliance',
        },
      },
    )
    assert.equal(missingAuthorityFrontlineResponse.status, 200, 'missing authority frontline marker action should return action response')
    assert.equal(readObject(missingAuthorityFrontlineResponse.data).ok, false, 'missing authority frontline marker action should be rejected')
    assert.equal(
      readObject(missingAuthorityFrontlineResponse.data).failureCode,
      'alliance_frontline_marker_forbidden',
      'missing authority failure code',
    )

    const unknownAuthorityFrontlineResponse = await requestJson(
      baseUrl,
      '/api/world/action?includeWorld=false',
      'POST',
      {
        action: 'updateAllianceFrontlineMarker',
        payload: {
          markerId: 'frontline_marker_luoyang_push_v1',
          factionId: 'player',
          label: '洛阳推进线',
          fromCell: { x: 4300, y: 2460 },
          toCell: { x: 4387, y: 2482 },
          actorCommanderId: 'not_an_officer',
          note: '未知官员权限，应该被拒绝。',
          visibility: 'alliance',
        },
      },
    )
    assert.equal(unknownAuthorityFrontlineResponse.status, 200, 'unknown authority frontline marker action should return action response')
    assert.equal(readObject(unknownAuthorityFrontlineResponse.data).ok, false, 'unknown authority frontline marker action should be rejected')
    assert.equal(
      readObject(unknownAuthorityFrontlineResponse.data).failureCode,
      'alliance_frontline_marker_forbidden',
      'unknown authority failure code',
    )

    const noSessionFrontlineResponse = await requestJson(
      baseUrl,
      '/api/world/action?includeWorld=false',
      'POST',
      {
        action: 'updateAllianceFrontlineMarker',
        payload: {
          markerId: 'frontline_marker_luoyang_push_v1',
          factionId: 'player',
          label: '洛阳推进线',
          fromCell: { x: 4300, y: 2460 },
          toCell: { x: 4387, y: 2482 },
          actorCommanderId: 'ally_west',
          note: '官员在主世界标注，天下舆图同源展示。',
          visibility: 'alliance',
        },
      },
    )
    assert.equal(noSessionFrontlineResponse.status, 200, `frontline marker action without session failed: ${JSON.stringify(noSessionFrontlineResponse.data)}`)
    assert.equal(readObject(noSessionFrontlineResponse.data).ok, false, 'frontline marker action without session should be rejected')
    assert.equal(
      readObject(noSessionFrontlineResponse.data).failureCode,
      'alliance_frontline_marker_session_required',
      'frontline marker should require a player session token',
    )

    const ordinarySessionFrontlineResponse = await requestJsonWithHeaders(
      baseUrl,
      '/api/world/action?includeWorld=false',
      'POST',
      {
        Authorization: `Bearer ${ordinarySessionToken}`,
      },
      {
        action: 'updateAllianceFrontlineMarker',
        payload: {
          markerId: 'frontline_marker_luoyang_push_v1',
          factionId: 'player',
          label: '洛阳推进线',
          fromCell: { x: 4300, y: 2460 },
          toCell: { x: 4387, y: 2482 },
          actorCommanderId: 'ally_west',
          note: '普通成员不在同盟官职权限表，应被拒绝。',
          visibility: 'alliance',
        },
      },
    )
    assert.equal(ordinarySessionFrontlineResponse.status, 200, 'ordinary member frontline marker action should return action response')
    assert.equal(readObject(ordinarySessionFrontlineResponse.data).ok, false, 'ordinary member frontline marker action should be rejected')
    assert.equal(
      readObject(ordinarySessionFrontlineResponse.data).failureCode,
      'alliance_frontline_marker_forbidden',
      'ordinary member should not match alliance officer authority table',
    )

    const frontlineResponse = await requestJsonWithHeaders(
      baseUrl,
      '/api/world/action?includeWorld=false',
      'POST',
      {
        Authorization: `Bearer ${sessionToken}`,
      },
      {
        action: 'updateAllianceFrontlineMarker',
        payload: {
          markerId: 'frontline_marker_luoyang_push_v1',
          factionId: 'player',
          label: '洛阳推进线',
          fromCell: { x: 4300, y: 2460 },
          toCell: { x: 4387, y: 2482 },
          actorCommanderId: 'ally_west',
          note: '官员在主世界标注，天下舆图同源展示。',
          visibility: 'alliance',
        },
      },
    )
    assert.equal(frontlineResponse.status, 200, `frontline marker action failed: ${JSON.stringify(frontlineResponse.data)}`)
    assert.equal(readObject(frontlineResponse.data).ok, true, 'frontline marker action should succeed')

    const overviewAfterFrontline = await requestJson(baseUrl, TIANXIA_YUTU_QUERY, 'GET')
    assert.equal(overviewAfterFrontline.status, 200, 'overview after frontline marker should load')
    assertFrontlineMarker(readObject(overviewAfterFrontline.data))

    const nationFoundResponse = await requestJsonWithHeaders(
      baseUrl,
      '/api/nation/found',
      'POST',
      {
        Authorization: `Bearer ${sessionToken}`,
      },
      {
        factionId: 'player',
        actorCommanderId: 'ally_west',
        nationName: '青州试立国',
        color: '#3f7fbf',
        capitalTileId: 'tile_08',
      },
    )
    assert.equal(nationFoundResponse.status, 200, `nation founding failed: ${JSON.stringify(nationFoundResponse.data)}`)
    assert.equal(readObject(nationFoundResponse.data).ok, true, 'nation founding should succeed')

    const overviewAfterNation = await requestJson(baseUrl, TIANXIA_YUTU_QUERY, 'GET')
    assert.equal(overviewAfterNation.status, 200, 'overview after nation founding should load')
    assertRuntimeNationColor(readObject(overviewAfterNation.data))

    const nationProfileUpdateResponse = await requestJson(
      baseUrl,
      '/api/nation/profile/update',
      'POST',
      {
        factionId: 'player',
        nationName: '青州新国号',
        color: '#6b9f45',
      },
    )
    assert.equal(
      nationProfileUpdateResponse.status,
      409,
      `direct nation profile update should be locked after founding: ${JSON.stringify(nationProfileUpdateResponse.data)}`,
    )
    const nationProfileUpdatePayload = readObject(nationProfileUpdateResponse.data)
    assert.equal(nationProfileUpdatePayload.ok, false, 'direct nation profile update should be rejected')
    assert.equal(
      nationProfileUpdatePayload.failureCode,
      'nation_profile_locked_until_capital_migration',
      'nation profile should require capital migration to reselect name or color',
    )
    const lockedNation = readObject(nationProfileUpdatePayload.nation)
    const auditLog = lockedNation.auditLog
    assert.ok(Array.isArray(auditLog), 'nation profile lock response should expose audit log')
    assert.ok(
      auditLog.some((entry) => readObject(entry).action === 'foundNation'),
      'nation profile should record founding audit entry',
    )
    assert.equal(lockedNation.capitalTileId, 'tile_08', 'nation profile should retain selected capital tile')
    assert.equal(lockedNation.capitalName, '青石城', 'nation profile should retain selected capital name')

    const alreadyFoundedResponse = await requestJsonWithHeaders(
      baseUrl,
      '/api/nation/found',
      'POST',
      {
        Authorization: `Bearer ${sessionToken}`,
      },
      {
        factionId: 'player',
        actorCommanderId: 'ally_west',
        nationName: '青州再立国',
        color: '#3f7fbf',
        capitalTileId: 'tile_08',
      },
    )
    assert.equal(alreadyFoundedResponse.status, 409, 'second nation founding should be rejected')
    assert.equal(readObject(alreadyFoundedResponse.data).failureCode, 'nation_found_already_nation', 'second founding failure code')

    const overviewAfterNationProfileUpdate = await requestJson(baseUrl, TIANXIA_YUTU_QUERY, 'GET')
    assert.equal(overviewAfterNationProfileUpdate.status, 200, 'overview after nation profile update should load')
    assertRuntimeNationColor(readObject(overviewAfterNationProfileUpdate.data), '青州试立国', '#3f7fbf')

    console.log(JSON.stringify({ ok: true, layer: 'tianxia_yutu_overview', tileCount: 324 }, null, 2))
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
