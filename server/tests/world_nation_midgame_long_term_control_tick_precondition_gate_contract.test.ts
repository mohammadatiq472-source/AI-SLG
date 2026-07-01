import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  requiredLongTermControlTicksForRole,
  resolveCityControlAdministrativeRoleFromAuthoritativeRoles,
  type CityControlAdministrativeRole,
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

const contractsText = readFileSync(join(process.cwd(), 'shared/contracts/game/world.ts'), 'utf8')
const schemaText = readFileSync(join(process.cwd(), 'shared/schemas/worldAction.ts'), 'utf8')
const routeText = readFileSync(join(process.cwd(), 'server/src/routes/world.ts'), 'utf8')

assert.match(
  contractsText,
  /action: 'recordNationMidgameLongTermControlTickPrecondition'[\s\S]*cityId: string[\s\S]*cityName: string[\s\S]*sourceControlAuthorityId: string[\s\S]*sourceControlProgressId: string[\s\S]*tickAdvanceCount\?: number/,
  'D-W12A world contract must declare the long-term control tick precondition action payload.',
)
assert.match(
  contractsText,
  /longTermControlPreconditionId\?: string[\s\S]*longTermControlHeldTicks\?: number[\s\S]*longTermControlRequiredTicks\?: number[\s\S]*ownerTransferPreconditionReady\?: boolean[\s\S]*nationMidgameLongTermControlScope\?: 'long_term_control_tick_precondition_only_not_owner_transfer'/,
  'D-W12A world receipt must expose persistent long-term control precondition fields.',
)
assert.match(
  contractsText,
  /nationMidgameControl\?: NationMidgameLongTermControlState/,
  'D-W12A world state must retain nationMidgameControl readback.',
)
assert.match(
  schemaText,
  /z\.literal\('recordNationMidgameLongTermControlTickPrecondition'\)[\s\S]*cityId[\s\S]*cityName[\s\S]*sourceControlAuthorityId[\s\S]*sourceControlProgressId[\s\S]*tickAdvanceCount/,
  'D-W12A schema must parse the long-term control tick precondition action.',
)
assert.match(
  routeText,
  /case 'recordNationMidgameLongTermControlTickPrecondition'[\s\S]*recordNationMidgameLongTermControlTickPreconditionAction/,
  'D-W12A route must dispatch the long-term control tick precondition action through /api/world/action.',
)

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

const REPORT_PATH = join(process.cwd(), 'tmp', 'NATION_MIDGAME_LONG_TERM_CONTROL_TICK_PRECONDITION_20260609.json')

type Sample = {
  markerId: string
  cityId: string
  cityName: string
  administrativeRole: CityControlAdministrativeRole
  stateId: string
  regionId: string
}

function normalizeCityId(markerId: string, stateId: string, regionId: string, cityName: string): string {
  const raw = markerId || `${stateId}_${regionId}_${cityName}`
  return raw
    .normalize('NFKD')
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .slice(0, 120)
}

const tail: TailState = { stdout: [], stderr: [] }
const port = await getAvailablePort()
const child = spawnBackend(port, tail, {
  SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('world_nation_midgame_long_term_control_tick_precondition_gate'),
})
const baseUrl = `http://127.0.0.1:${port}`

try {
  const health = await waitForHealth(baseUrl, 90_000)
  assert.ok(health, `backend health check failed:\n${tail.stderr.join('\n')}`)

  const overview = await requestJson(baseUrl, OVERVIEW_QUERY, 'GET', undefined, 30_000)
  assert.equal(overview.status, 200, `overview query failed: ${JSON.stringify(overview.data)}`)

  const payload = readObject(overview.data)
  const layer = readObject(payload.tianxia_yutu_overview_layer)
  const cityMarkers = Array.isArray(layer.city_markers) ? layer.city_markers : []
  const representative = new Map<CityControlAdministrativeRole, Sample>()

  for (const rawMarker of cityMarkers) {
    const marker = readObject(rawMarker)
    const roles = Array.isArray(marker.roles)
      ? marker.roles.map((entry) => String(entry ?? '').trim()).filter(Boolean)
      : []
    const resolved = resolveCityControlAdministrativeRoleFromAuthoritativeRoles(roles)
    if (!resolved.administrativeRole || representative.has(resolved.administrativeRole)) {
      continue
    }
    const markerId = String(marker.marker_id ?? '').trim()
    const cityName = String(marker.label ?? '').trim()
    const stateId = String(marker.state_id ?? '').trim()
    const regionId = String(marker.region_id ?? '').trim()
    if (!markerId || !cityName || !stateId || !regionId) {
      continue
    }
    representative.set(resolved.administrativeRole, {
      markerId,
      cityId: normalizeCityId(markerId, stateId, regionId, cityName),
      cityName,
      administrativeRole: resolved.administrativeRole,
      stateId,
      regionId,
    })
    if (representative.size === 3) {
      break
    }
  }

  assert.equal(representative.size, 3, 'D-W12A gate must derive state_government, commandery_seat, and city samples from authoritative city_markers.')

  const samples = (['state_government', 'commandery_seat', 'city'] as const).map((role) => {
    const sample = representative.get(role)
    assert.ok(sample, `missing authoritative sample for role ${role}`)
    return sample as Sample
  })

  const invalidCases = [
    { cityId: '', cityName: '缺城池', sourceControlAuthorityId: 'authority_missing_city', sourceControlProgressId: 'progress_missing_city' },
    { cityId: 'missing_name', cityName: '', sourceControlAuthorityId: 'authority_missing_name', sourceControlProgressId: 'progress_missing_name' },
    { cityId: 'missing_authority', cityName: '缺军令', sourceControlAuthorityId: '', sourceControlProgressId: 'progress_missing_authority' },
    { cityId: 'missing_progress', cityName: '缺进度', sourceControlAuthorityId: 'authority_missing_progress', sourceControlProgressId: '' },
  ]

  for (const invalidCase of invalidCases) {
    const invalid = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'recordNationMidgameLongTermControlTickPrecondition',
      payload: {
        factionId: 'player',
        administrativeRole: 'city',
        organizationId: 'player',
        sourcePageId: 'nation/midgame',
        tickAdvanceCount: 1,
        nextStepLabel: '继续压稳',
        ...invalidCase,
      },
    }, 20_000)
    assert.equal(invalid.status, 400, 'missing long-term control source fields should be rejected by the formal schema gate')
  }

  const sampleResults: Array<Record<string, unknown>> = []

  for (const sample of samples) {
    const sourceControlAuthorityId = `control_authority_${sample.cityId}`
    const sourceControlProgressId = `control_progress_${sample.cityId}`
    const judgment = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'recordNationMidgameCityControlJudgment',
      payload: {
        factionId: 'player',
        cityId: sample.cityId,
        cityName: sample.cityName,
        administrativeRole: sample.administrativeRole,
        organizationId: 'player',
        sourceControlAuthorityId,
        sourceControlProgressId,
        sourcePageId: 'nation/midgame',
      },
    }, 20_000)
    assert.equal(judgment.status, 200)
    const judgmentData = readObject(judgment.data)
    const judgmentReceipt = readObject(judgmentData.receipt)
    assert.equal(judgmentData.ok, true, `generic city judgment should succeed for ${sample.cityName}`)
    assert.equal(judgmentReceipt.ownershipTransferApplied, false)

    const requiredTicks = requiredLongTermControlTicksForRole(sample.administrativeRole)
    const firstAdvance = requiredTicks - 1
    const first = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'recordNationMidgameLongTermControlTickPrecondition',
      payload: {
        factionId: 'player',
        cityId: sample.cityId,
        cityName: sample.cityName,
        administrativeRole: sample.administrativeRole,
        organizationId: 'player',
        sourceControlAuthorityId,
        sourceControlProgressId,
        sourcePageId: 'nation/midgame',
        tickAdvanceCount: firstAdvance,
      },
    }, 20_000)
    assert.equal(first.status, 200)
    const firstData = readObject(first.data)
    const firstReceipt = readObject(firstData.receipt)
    assert.equal(firstData.ok, true)
    assert.equal(firstReceipt.longTermControlHeldTicks, firstAdvance)
    assert.equal(firstReceipt.longTermControlRequiredTicks, requiredTicks)
    assert.equal(firstReceipt.ownerTransferPreconditionReady, false)
    assert.equal(firstReceipt.ownershipTransferApplied, false)

    const firstWorld = readObject(firstData.world)
    const firstControlState = readObject(firstWorld.nationMidgameControl)
    const firstPreconditions = readObject(firstControlState.longTermControlPreconditions)
    const firstRecord = Object.values(firstPreconditions)
      .map((entry) => readObject(entry))
      .find((entry) => String(entry.cityId ?? '') === sample.cityId && String(entry.sourceControlAuthorityId ?? '') === sourceControlAuthorityId)
    assert.ok(firstRecord, `world readback must retain the first long-term control record for ${sample.cityName}`)
    assert.equal(firstRecord?.ownerTransferPreconditionReady, false)

    const second = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'recordNationMidgameLongTermControlTickPrecondition',
      payload: {
        factionId: 'player',
        cityId: sample.cityId,
        cityName: sample.cityName,
        administrativeRole: sample.administrativeRole,
        organizationId: 'player',
        sourceControlAuthorityId,
        sourceControlProgressId,
        sourcePageId: 'nation/midgame',
        tickAdvanceCount: 1,
      },
    }, 20_000)
    assert.equal(second.status, 200)
    const secondData = readObject(second.data)
    const secondReceipt = readObject(secondData.receipt)
    assert.equal(secondData.ok, true)
    assert.equal(secondReceipt.longTermControlHeldTicks, requiredTicks)
    assert.equal(secondReceipt.longTermControlRequiredTicks, requiredTicks)
    assert.equal(secondReceipt.ownerTransferPreconditionReady, true)
    assert.equal(secondReceipt.ownershipTransferApplied, false)
    assert.equal(
      secondReceipt.nationMidgameLongTermControlScope,
      'long_term_control_tick_precondition_only_not_owner_transfer',
    )

    const secondWorld = readObject(secondData.world)
    const secondControlState = readObject(secondWorld.nationMidgameControl)
    const secondPreconditions = readObject(secondControlState.longTermControlPreconditions)
    const secondRecord = Object.values(secondPreconditions)
      .map((entry) => readObject(entry))
      .find((entry) => String(entry.cityId ?? '') === sample.cityId && String(entry.sourceControlAuthorityId ?? '') === sourceControlAuthorityId)
    assert.ok(secondRecord, `world readback must retain the ready long-term control record for ${sample.cityName}`)
    assert.equal(secondRecord?.ownerTransferPreconditionReady, true)
    assert.equal(secondRecord?.ownershipTransferApplied, false)
    assert.equal(secondRecord?.longTermControlHeldTicks, requiredTicks)

    sampleResults.push({
      cityId: sample.cityId,
      cityName: sample.cityName,
      administrativeRole: sample.administrativeRole,
      markerId: sample.markerId,
      stateId: sample.stateId,
      regionId: sample.regionId,
      requiredTicks,
      firstAdvance,
      longTermControlPreconditionId: secondReceipt.longTermControlPreconditionId,
      ownerTransferPreconditionReady: secondReceipt.ownerTransferPreconditionReady,
      ownershipTransferApplied: secondReceipt.ownershipTransferApplied,
    })
  }

  const report = {
    ok: true,
    reportId: 'nation_midgame_long_term_control_tick_precondition_20260609',
    dataSource: {
      endpoint: OVERVIEW_QUERY,
      layer: 'tianxia_yutu_overview_layer.city_markers',
      normalizedTableRequirement: 'representative role samples must be chosen from the D-W11B normalized authoritative city table',
    },
    totals: {
      cityMarkers: cityMarkers.length,
      representativeRoleCount: samples.length,
      ownershipTransferApplied: false,
    },
    sampleResults,
  }

  mkdirSync(dirname(REPORT_PATH), { recursive: true })
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))

  console.log(JSON.stringify(report, null, 2))
} finally {
  await shutdownChild(child)
}
