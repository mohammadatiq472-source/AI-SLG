import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { createInitialWorldState } from '../../shared/domain/scenario'
import type { Unit } from '../../shared/contracts/game/world'
import {
  buildSessionPersistPath,
  getAvailablePort,
  readArray,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

function setupAttackerForBattle(unit: Unit, tileId: string) {
  unit.tileId = tileId
  unit.strength = Math.max(unit.strength, 860)
  unit.supply = Math.max(unit.supply, 8)
  unit.mobility = Math.max(unit.mobility, 20)
  unit.status = '待命'
  unit.currentTask = undefined
  unit.corps.readiness = Math.max(unit.corps.readiness, 95)
}

function seedBattleWorld(): { path: string; unitId: string; tileId: string } {
  const world = createInitialWorldState()
  world.feedback.battleRecords = []
  const unit = world.units.find((candidate) => candidate.faction === 'player')
  const tile = world.map.tiles.find((candidate) => candidate.type === 'resource')
  assert.ok(unit, 'seed world should include a player unit')
  assert.ok(tile, 'seed world should include a resource tile')
  tile.owner = 'neutral'
  tile.enemyPressure = 1
  tile.resourceLevel = 1
  setupAttackerForBattle(unit, tile.id)
  const path = buildSessionPersistPath('player_history_battle_occupy_tile_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { path, unitId: unit.id, tileId: tile.id }
}

function visibleCardText(card: Record<string, unknown>): string {
  return [
    card.actorName,
    card.title,
    card.summary,
    card.locationLabel,
    card.targetLabel,
    card.resultLabel,
    card.consequenceLabel,
    card.nextActionLabel,
  ].filter(Boolean).join('\n')
}

async function requestJsonWithBearer(
  baseUrl: string,
  path: string,
  bearerToken: string,
  timeoutMs = 15_000,
) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(new URL(path, baseUrl), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
      signal: controller.signal,
    })
    const raw = await response.text()
    return {
      status: response.status,
      data: raw.trim().length > 0 ? JSON.parse(raw) as unknown : null,
    }
  } finally {
    clearTimeout(timer)
  }
}

async function runBattleOccupyTileProducerContract() {
  const seeded = seedBattleWorld()
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: seeded.path,
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)
    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: 'player',
    })
    assert.equal(join.status, 200, `session join failed: ${JSON.stringify(join.data)}`)
    const sessionToken = String(readObject(join.data).token ?? '')
    assert.ok(sessionToken.length > 0, 'session join should return bearer token')

    const response = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'occupyTile',
      payload: {
        factionId: 'player',
        unitId: seeded.unitId,
        tileId: seeded.tileId,
      },
    }, 60_000)
    assert.equal(response.status, 200, `occupyTile route failed: ${JSON.stringify(response.data)}`)
    const payload = readObject(response.data)
    assert.equal(payload.ok, true, `occupyTile should succeed: ${JSON.stringify(payload)}`)
    const receipt = readObject(payload.receipt)
    assert.equal(receipt.action, 'occupyTile')
    assert.equal(receipt.occupied, true)

    const world = readObject(payload.world)
    const feedback = readObject(world.feedback)
    const records = readArray(feedback.battleRecords).map((item) => readObject(item))
    const record = records.find((item) => item.attackerUnitId === seeded.unitId && item.tileId === seeded.tileId)
    assert.ok(record, 'occupyTile should create a real battle record for the player unit and target tile')
    assert.equal(record.reportKind, 'resource_guard')
    assert.ok(String(record.id).length > 0, 'battle record should have a durable id')

    const events = await requestJson(baseUrl, '/api/events?limit=20', 'GET')
    assert.equal(events.status, 200, `events route failed: ${JSON.stringify(events.data)}`)
    const eventItems = readArray(readObject(events.data).items ?? readObject(events.data).events).map((item) => readObject(item))
    const occupyEvent = eventItems.find((item) => item.action === 'occupy_tile' && item.success === true)
    assert.ok(occupyEvent, 'runtime events should include successful occupy_tile')
    const metadata = readObject(readObject(occupyEvent).metadata)
    assert.equal(metadata.playerHistoryCategory, 'battle')
    assert.equal(metadata.playerHistoryTitle, '战斗已结束')
    assert.equal(typeof metadata.playerHistoryActorName, 'string')
    assert.equal(typeof metadata.playerHistorySummary, 'string')
    assert.equal(typeof metadata.playerHistoryLocation, 'string')
    assert.equal(typeof metadata.playerHistoryTarget, 'string')
    assert.ok(['胜利', '失利', '僵持'].includes(String(metadata.playerHistoryResultLabel)))
    assert.equal(metadata.playerHistoryNextAction, '查看战报')
    assert.equal(metadata.playerHistorySeverity, 'medium')
    assert.equal(metadata.playerHistoryScope, 'own_faction')
    assert.equal(metadata.playerHistorySharePolicy, 'explicit_spectator')
    assert.equal(metadata.playerHistoryShareStateLabel, '可分享')
    assert.equal(metadata.playerHistoryShareRetentionLabel, '分享后限时可查看')
    assert.equal(typeof metadata.playerHistoryDedupeKey, 'string')
    assert.equal(metadata.battleReportId, record.id)

    const history = await requestJsonWithBearer(baseUrl, '/api/player-history?limit=20&eventLimit=20&civilMemoryLimit=5', sessionToken)
    assert.equal(history.status, 200, `player-history route failed: ${JSON.stringify(history.data)}`)
    const timeline = readObject(readObject(history.data).timeline)
    const cards = readArray(timeline.cards).map((item) => readObject(item))
    const battleCard = cards.find((card) => card.category === 'battle' && card.title === '战斗已结束')
    assert.ok(battleCard, 'player history should expose the real occupyTile battle as a battle card')
    assert.equal(battleCard.nextActionLabel, '查看战报')
    assert.equal(battleCard.sharePolicy, 'explicit_spectator')
    assert.equal(battleCard.shareStateLabel, '可分享')
    assert.equal(battleCard.shareRetentionLabel, '分享后限时可查看')
    assert.equal(readObject(battleCard.sourceRefs).worldEventId, occupyEvent.id)

    const visiblePayload = visibleCardText(battleCard)
    for (const required of ['战斗已结束', '查看战报']) {
      assert.ok(visiblePayload.includes(required), `battle visible copy should include ${required}`)
    }
    for (const forbidden of [
      'recordBattleOutcome',
      'battleReportSurface',
      'battle_report_panel/list/detail',
      String(record.id),
      seeded.unitId,
      seeded.tileId,
      '/api/world/action',
      'occupy_tile',
      'guardTemplateId',
      'metadata',
      'debug',
      'route',
      'fixture',
      'snake_case',
    ]) {
      assert.equal(visiblePayload.includes(forbidden), false, `battle visible copy leaked implementation term: ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

runBattleOccupyTileProducerContract().then(() => {
  console.log('[player_history_battle_occupy_tile_producer_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_battle_occupy_tile_producer_contract] failed:', error)
  process.exitCode = 1
})
