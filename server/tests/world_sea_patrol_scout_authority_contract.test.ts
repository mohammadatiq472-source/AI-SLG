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

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail)

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const opened = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'openSeaRoute',
      payload: {
        factionId: 'player',
        sourceDockId: 'east_han_coastal_dock_quanzhou',
        overseasContactId: 'wa_contact_scoutable',
      },
    }, 60_000)
    assert.equal(opened.status, 200, `openSeaRoute failed: ${JSON.stringify(opened.data)}`)
    assert.equal(readObject(opened.data).ok, true, 'W8 patrol should start from the W6 route_open chain')

    const scouted = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'seaPatrolScout',
      payload: {
        factionId: 'player',
        sourceDockId: 'east_han_coastal_dock_quanzhou',
        overseasContactId: 'wa_contact_scoutable',
        routeId: 'east_han_coastal_dock_to_wa_contact',
        actorAiPlayerId: 'ai_player_maritime_scout_01',
      },
    }, 60_000)

    assert.equal(scouted.status, 200, `seaPatrolScout failed: ${JSON.stringify(scouted.data)}`)
    const scoutedPayload = readObject(scouted.data)
    assert.equal(scoutedPayload.ok, true, `seaPatrolScout should succeed: ${JSON.stringify(scouted.data)}`)
    const receipt = readObject(scoutedPayload.receipt)
    assert.equal(receipt.action, 'seaPatrolScout')
    assert.equal(receipt.routeId, 'east_han_coastal_dock_to_wa_contact')
    assert.equal(receipt.sourceDockId, 'east_han_coastal_dock_quanzhou')
    assert.equal(receipt.overseasContactId, 'wa_contact_scoutable')
    assert.equal(receipt.patrolKind, 'scout')
    assert.equal(receipt.patrolStatus, 'scout_report_ready')
    assert.equal(receipt.maritimeActivityChipId, 'maritime_activity_chip_v1')
    assert.equal(receipt.maritimeReportResultChipId, 'maritime_report_result_chip_v1')
    assert.equal(receipt.navalBattleScope, 'patrol_scout_only_no_full_naval_combat')
    assert.equal(receipt.regionTokenId, 'region_token_wa_v1')
    assert.equal(receipt.actorAiPlayerId, 'ai_player_maritime_scout_01')
    assert.ok(String(receipt.patrolReportId).startsWith('sea_patrol_scout_report_'))

    const world = readObject(scoutedPayload.world)
    const reports = readArray(world.reports).map((report) => readObject(report))
    const patrolReport = reports.find((report) => report.id === receipt.patrolReportId)
    assert.ok(patrolReport, 'seaPatrolScout should write a player-readable maritime report')
    assert.ok(String(patrolReport.title).includes('海巡') || String(patrolReport.title).includes('侦察'))
    assert.ok(String(patrolReport.detail).includes('maritime_activity_chip_v1'))
    assert.ok(String(patrolReport.detail).includes('maritime_report_result_chip_v1'))
    assert.ok(String(patrolReport.detail).includes('不代表完整海战'))

    console.log('[world_sea_patrol_scout_authority_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[world_sea_patrol_scout_authority_contract] failed:', error)
  process.exitCode = 1
})
