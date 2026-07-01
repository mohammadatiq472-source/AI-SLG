import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  CITY_CONTROL_JUDGMENT_COVERAGE_SAMPLES,
  cityControlJudgmentKindForRole,
  resolveCityControlAdministrativeRoleFromAuthoritativeRoles,
} from '../../shared/domain/cityControlJudgment'
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
const OVERVIEW_QUERY =
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
  '&includeLayers=tianxia_yutu_overview,labels'

const REPORT_PATH = join(process.cwd(), 'tmp', 'NATION_MIDGAME_CITY_CONTROL_FULL_TABLE_DATA_QUALITY_20260609.json')

type ControlRole = 'state_government' | 'commandery_seat' | 'city'

const tail: TailState = { stdout: [], stderr: [] }
const port = await getAvailablePort()
const child = spawnBackend(port, tail, {
  SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('world_nation_midgame_city_control_full_table_data_quality_gate'),
})
const baseUrl = `http://127.0.0.1:${port}`

try {
  const health = await waitForHealth(baseUrl, 90_000)
  assert.ok(health, `backend health check failed:\n${tail.stderr.join('\n')}`)

  const response = await requestJson(baseUrl, OVERVIEW_QUERY, 'GET', undefined, 30_000)
  assert.equal(response.status, 200, `overview query failed: ${JSON.stringify(response.data)}`)

  const payload = readObject(response.data)
  const layer = readObject(payload.tianxia_yutu_overview_layer)
  const cityMarkers = Array.isArray(layer.city_markers) ? layer.city_markers : []
  const jumpTargets = Array.isArray(layer.jump_targets) ? layer.jump_targets : []
  const navigationFacets = readObject(layer.navigation_facets)
  const targetScopeCounts = readObject(navigationFacets.target_scope_counts)

  const rawRoleCounts: Record<string, number> = {}
  const resolvedRoleCounts: Record<ControlRole, number> = {
    state_government: 0,
    commandery_seat: 0,
    city: 0,
  }
  const kindCounts = {
    prefectureControlJudgment: 0,
    commanderyControlJudgment: 0,
    cityControlJudgment: 0,
  }
  const missingFieldEntries: Array<Record<string, unknown>> = []
  const unresolvedRoleEntries: Array<Record<string, unknown>> = []
  const excludedReferenceEntries: Array<Record<string, unknown>> = []

  for (const rawMarker of cityMarkers) {
    const marker = readObject(rawMarker)
    const roles = Array.isArray(marker.roles)
      ? marker.roles.map((entry) => String(entry ?? '').trim()).filter(Boolean)
      : []

    for (const role of roles) {
      rawRoleCounts[role] = (rawRoleCounts[role] ?? 0) + 1
    }
    if (roles.length === 0) {
      rawRoleCounts['(none)'] = (rawRoleCounts['(none)'] ?? 0) + 1
    }

    const markerId = String(marker.marker_id ?? '').trim()
    const cityName = String(marker.label ?? '').trim()
    const stateId = String(marker.state_id ?? '').trim()
    const regionId = String(marker.region_id ?? '').trim()
    const sourceCityPlacementId = String(marker.source_city_placement_id ?? '').trim()

    if (!markerId || !cityName || !stateId || !regionId) {
      missingFieldEntries.push({
        marker_id: markerId,
        city_name: cityName,
        state_id: stateId,
        region_id: regionId,
        source_city_placement_id: sourceCityPlacementId,
        roles,
      })
    }

    const resolved = resolveCityControlAdministrativeRoleFromAuthoritativeRoles(roles)
    if (resolved.administrativeRole) {
      resolvedRoleCounts[resolved.administrativeRole] += 1
      const kind = cityControlJudgmentKindForRole(resolved.administrativeRole)
      kindCounts[kind] += 1
    }
    if (resolved.excludedFromFullTable) {
      const exactJumpMatches = jumpTargets
        .filter(
          (rawTarget) =>
            String(readObject(rawTarget).source_city_placement_id ?? '').trim() === sourceCityPlacementId,
        )
        .map((rawTarget) => {
          const target = readObject(rawTarget)
          return {
            target_id: String(target.target_id ?? '').trim(),
            target_scope: String(target.target_scope ?? '').trim(),
            label: String(target.label ?? '').trim(),
          }
        })
      excludedReferenceEntries.push({
        marker_id: markerId,
        city_name: cityName,
        state_id: stateId,
        region_id: regionId,
        source_city_placement_id: sourceCityPlacementId,
        source_roles: resolved.sourceRoles,
        exclude_reason: resolved.excludeReason,
        exact_jump_matches: exactJumpMatches,
      })
      continue
    }
    if (!resolved.administrativeRole || resolved.unknownSourceRoles.length > 0) {
      unresolvedRoleEntries.push({
        marker_id: markerId,
        city_name: cityName,
        state_id: stateId,
        region_id: regionId,
        source_city_placement_id: sourceCityPlacementId,
        source_roles: resolved.sourceRoles,
        matched_authoritative_role: resolved.matchedAuthoritativeRole,
        resolved_control_role: resolved.administrativeRole,
        unknown_source_roles: resolved.unknownSourceRoles,
      })
    }
  }

  const coverageSubsetCheck = CITY_CONTROL_JUDGMENT_COVERAGE_SAMPLES.map((sample) => {
    const hit = cityMarkers
      .map((rawMarker) => readObject(rawMarker))
      .find((marker) => String(marker.label ?? '').trim() === sample.cityName)
    const markerRoles = Array.isArray(hit?.roles)
      ? hit.roles.map((entry) => String(entry ?? '').trim()).filter(Boolean)
      : []
    const resolved = resolveCityControlAdministrativeRoleFromAuthoritativeRoles(markerRoles)
    return {
      sample_city_id: sample.cityId,
      sample_city_name: sample.cityName,
      present_in_authoritative_table: Boolean(hit),
      authoritative_marker_id: String(hit?.marker_id ?? '').trim(),
      authoritative_roles: markerRoles,
      resolved_control_role: resolved.administrativeRole,
      expected_sample_control_role: sample.administrativeRole,
      role_match: resolved.administrativeRole === sample.administrativeRole,
    }
  })
  const sampleMismatchEntries = coverageSubsetCheck.filter(
    (entry) => !entry.present_in_authoritative_table || !entry.role_match,
  )

  const report = {
    ok:
      missingFieldEntries.length === 0 &&
      unresolvedRoleEntries.length === 0 &&
      sampleMismatchEntries.length === 0,
    reportId: 'nation_midgame_city_control_full_table_data_quality_20260609',
    dataSource: {
      endpoint: OVERVIEW_QUERY,
      layer: 'tianxia_yutu_overview_layer.city_markers',
      authoritativeSourcePolicy:
        'server map-layout overview layer reuses accepted_authoring_layers.city_placements as formal city marker table',
      navigationFacetSource: 'tianxia_yutu_overview_layer.navigation_facets.target_scope_counts',
    },
    totals: {
      cityMarkers: cityMarkers.length,
      targetScopeCounts,
      resolvedControlRoleCounts: resolvedRoleCounts,
      resolvedKindCounts: kindCounts,
      rawRoleCounts,
      unresolvedRoleCount: unresolvedRoleEntries.length,
      missingFieldCount: missingFieldEntries.length,
      excludedReferenceCount: excludedReferenceEntries.length,
      sampleMismatchCount: sampleMismatchEntries.length,
    },
    coverageSubsetCheck,
    sampleMismatchEntries,
    missingFieldEntries,
    unresolvedRoleEntries,
    excludedReferenceEntries,
    ownershipTransferAppliedExpected: false,
    blockerReasons: [
      ...(sampleMismatchEntries.length > 0
        ? ['D-W10A sample set does not fully match the current authoritative city table roles/labels']
        : []),
      ...(unresolvedRoleEntries.length > 0
        ? ['authoritative city table still exposes unresolved source roles for city-control mapping']
        : []),
    ],
  }

  mkdirSync(dirname(REPORT_PATH), { recursive: true })
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))

  assert.equal(cityMarkers.length > CITY_CONTROL_JUDGMENT_COVERAGE_SAMPLES.length, true, 'full-table gate must exceed the D-W10A six-sample subset')
  assert.equal(Number(targetScopeCounts.state_government ?? 0) >= 2, true, 'formal navigation facets should expose state governments')
  assert.equal(Number(targetScopeCounts.commandery_seat ?? 0) >= 2, true, 'formal navigation facets should expose commandery seats')
  assert.equal(resolvedRoleCounts.city >= 2, true, 'authoritative city table should resolve ordinary city control roles')
  assert.equal(
    excludedReferenceEntries.every((entry) => Array.isArray(entry.exact_jump_matches) && entry.exact_jump_matches.length === 0),
    true,
    `excluded authoring-reference markers should not have exact city jump-target matches; see ${REPORT_PATH}`,
  )
  assert.equal(missingFieldEntries.length, 0, `missing city marker fields found; see ${REPORT_PATH}`)
  assert.equal(
    sampleMismatchEntries.length,
    0,
    `D-W10A sample set diverges from the authoritative city table; see ${REPORT_PATH}`,
  )
  assert.equal(
    coverageSubsetCheck.every((entry) => entry.present_in_authoritative_table && entry.role_match),
    true,
    `D-W10A coverage samples should remain a subset of the authoritative city table; see ${REPORT_PATH}`,
  )
  assert.equal(
    unresolvedRoleEntries.length,
    0,
    `unresolved authoritative city roles block full-table GREEN; see ${REPORT_PATH}`,
  )

  console.log(JSON.stringify({
    ok: true,
    reportPath: REPORT_PATH,
    cityMarkers: cityMarkers.length,
    resolvedControlRoleCounts: resolvedRoleCounts,
    rawRoleCounts,
  }, null, 2))
} finally {
  await shutdownChild(child)
}
