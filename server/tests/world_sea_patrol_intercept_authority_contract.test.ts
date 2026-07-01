import assert from 'node:assert/strict'
import {
  getAvailablePort,
  readArray,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

const routeId = 'east_han_coastal_dock_to_wa_contact'
const sourceDockId = 'east_han_coastal_dock_quanzhou'
const overseasContactId = 'wa_contact_scoutable'

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail)

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const blocked = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'seaPatrolIntercept',
      payload: {
        factionId: 'player',
        routeId,
        sourceDockId,
        overseasContactId,
        attackerVesselType: 'interceptor_warship',
        defenderVesselType: 'transport_warship',
      },
    }, 60_000)
    assert.equal(blocked.status, 200)
    const blockedPayload = readObject(blocked.data)
    assert.equal(blockedPayload.ok, false, 'intercept must not run before the route is open')
    assert.equal(blockedPayload.failureCode, 'sea_route_not_open')

    const opened = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'openSeaRoute',
      payload: {
        factionId: 'player',
        sourceDockId,
        overseasContactId,
      },
    }, 60_000)
    assert.equal(opened.status, 200, `openSeaRoute failed: ${JSON.stringify(opened.data)}`)
    assert.equal(readObject(opened.data).ok, true)

    const missingScout = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'seaPatrolIntercept',
      payload: {
        factionId: 'player',
        routeId,
        sourceDockId,
        overseasContactId,
        attackerVesselType: 'interceptor_warship',
        defenderVesselType: 'transport_warship',
      },
    }, 60_000)
    assert.equal(missingScout.status, 200)
    const missingScoutPayload = readObject(missingScout.data)
    assert.equal(missingScoutPayload.ok, false, 'intercept requires the W8 seaPatrolScout report first')
    assert.equal(missingScoutPayload.failureCode, 'missing_patrol_scout_report')

    const scouted = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'seaPatrolScout',
      payload: {
        factionId: 'player',
        routeId,
        sourceDockId,
        overseasContactId,
        actorAiPlayerId: 'ai_player_maritime_intercept_01',
      },
    }, 60_000)
    assert.equal(scouted.status, 200, `seaPatrolScout failed: ${JSON.stringify(scouted.data)}`)
    assert.equal(readObject(scouted.data).ok, true)

    const intercepted = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'seaPatrolIntercept',
      payload: {
        factionId: 'player',
        routeId,
        sourceDockId,
        overseasContactId,
        attackerVesselType: 'interceptor_warship',
        defenderVesselType: 'transport_warship',
        actorAiPlayerId: 'ai_player_maritime_intercept_01',
      },
    }, 60_000)

    assert.equal(intercepted.status, 200, `seaPatrolIntercept failed: ${JSON.stringify(intercepted.data)}`)
    const interceptedPayload = readObject(intercepted.data)
    assert.equal(interceptedPayload.ok, true)
    const receipt = readObject(interceptedPayload.receipt)
    assert.equal(receipt.action, 'seaPatrolIntercept')
    assert.equal(receipt.routeId, routeId)
    assert.equal(receipt.sourceDockId, sourceDockId)
    assert.equal(receipt.overseasContactId, overseasContactId)
    assert.equal(receipt.interceptReportId, interceptedPayload.relatedId)
    assert.equal(receipt.maritimeReportResultChipId, 'maritime_report_result_chip_v1')
    assert.equal(receipt.navalBattleScope, 'patrol_intercept_minimal_battle_report_only')
    assert.equal(receipt.battleReportSurface, 'battle_report_panel/list/detail')
    assert.equal(receipt.attackerVesselType, 'interceptor_warship')
    assert.equal(receipt.defenderVesselType, 'transport_warship')
    assert.equal(receipt.attackerCarriedUnitCapacity, 1)
    assert.equal(receipt.defenderCarriedUnitCapacity, 3)
    assert.equal(receipt.attackerCombatBonusPercent, 20)
    assert.equal(receipt.defenderCombatBonusPercent, 0)
    assert.equal(receipt.interceptOutcome, 'interceptor_advantage')

    const world = readObject(interceptedPayload.world)
    const reports = readArray(world.reports).map((report) => readObject(report))
    const interceptReport = reports.find((report) => report.id === receipt.interceptReportId)
    assert.ok(interceptReport, 'seaPatrolIntercept should write a report into the existing report list')
    assert.ok(String(interceptReport.title).includes('海上拦截'))
    assert.ok(String(interceptReport.detail).includes('reportKind=naval_patrol_intercept'))
    assert.ok(String(interceptReport.detail).includes('maritimeReportResultChipId=maritime_report_result_chip_v1'))
    assert.ok(String(interceptReport.detail).includes('battleReportSurface=battle_report_panel/list/detail'))
    assert.ok(String(interceptReport.detail).includes('interceptor_warship'))
    assert.ok(String(interceptReport.detail).includes('transport_warship'))
    assert.ok(String(interceptReport.detail).includes('combatBonusPercent=20'))
    assert.ok(String(interceptReport.detail).includes('transport_capacity=3'))

    console.log('[world_sea_patrol_intercept_authority_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[world_sea_patrol_intercept_authority_contract] failed:', error)
  process.exitCode = 1
})
