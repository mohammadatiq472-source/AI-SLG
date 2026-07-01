import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
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

const MAIN_CITY_ID = 'tile_08'
const UPGRADE_GROUP_ID = 'tax'
const UPGRADE_BUILDING_ID = 'tax_office'

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

async function requestJsonWithBearer(baseUrl: string, path: string, token?: string) {
  const response = await fetch(new URL(path, baseUrl), {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  const raw = await response.text()
  return {
    status: response.status,
    data: raw.trim().length > 0 ? JSON.parse(raw) as unknown : null,
  }
}

async function runMainCityEconomyReceiptContract() {
  rmSync(join(process.cwd(), 'tmp', 'player-history-main-city-economy-receipt'), { recursive: true, force: true })

  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('player_history_main_city_economy_receipt_session_state'),
  })

  try {
    const health = await waitForHealth(baseUrl, 90_000)
    assert.ok(health?.ok, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const upgrade = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'promoteCityBuilding',
      payload: {
        factionId: 'player',
        cityId: MAIN_CITY_ID,
        groupId: UPGRADE_GROUP_ID,
        buildingId: UPGRADE_BUILDING_ID,
      },
    }, 60_000)
    assert.equal(upgrade.status, 200, `promoteCityBuilding failed: ${JSON.stringify(upgrade.data)}`)
    const upgradePayload = readObject(upgrade.data)
    assert.equal(upgradePayload.ok, true)
    const receipt = readObject(upgradePayload.receipt)
    assert.equal(receipt.action, 'promoteCityBuilding')
    assert.equal(receipt.cityId, MAIN_CITY_ID)
    assert.equal(receipt.groupId, UPGRADE_GROUP_ID)
    assert.equal(receipt.buildingId, UPGRADE_BUILDING_ID)
    assert.equal(receipt.previousLevel, 4)
    assert.equal(receipt.nextLevel, 5)
    assert.deepEqual(readObject(receipt.resourcesSpent), { actionPoints: 3, food: 11, wood: 5, copper: 10 })
    assert.equal(readObject(receipt.readModelRefresh).endpoint, '/api/world/main-city/facility-tree')

    const refreshed = await requestJson(baseUrl, '/api/world/main-city/facility-tree', 'GET', undefined, 60_000)
    assert.equal(refreshed.status, 200, `facility tree refresh failed: ${JSON.stringify(refreshed.data)}`)
    const facilityTree = readObject(readObject(refreshed.data).mainCityFacilityTree)
    const upgradedBuilding = readArray(facilityTree.buildings)
      .map((item) => readObject(item))
      .find((item) => item.id === UPGRADE_BUILDING_ID)
    assert.ok(upgradedBuilding, 'facility tree should include upgraded tax building')
    assert.equal(upgradedBuilding.level, '5/5')
    assert.equal(upgradedBuilding.status, '已同步升级')

    const events = await requestJson(baseUrl, '/api/events?limit=20', 'GET')
    assert.equal(events.status, 200, `events route failed: ${JSON.stringify(events.data)}`)
    const eventItems = readArray(readObject(events.data).items ?? readObject(events.data).events).map((item) => readObject(item))
    const economyEvent = eventItems.find((item) => item.action === 'promote_city_building' && item.success === true)
    assert.ok(economyEvent, 'runtime events should include successful promote_city_building')
    const metadata = readObject(readObject(economyEvent).metadata)
    assert.equal(metadata.playerHistoryCategory, 'economy_city')
    assert.equal(metadata.playerHistoryTitle, '设施升级完成')
    assert.equal(metadata.playerHistoryActorName, '主城内府')
    assert.equal(metadata.playerHistoryLocation, '主城')
    assert.equal(metadata.playerHistoryTarget, '税务府')
    assert.equal(metadata.playerHistoryResultLabel, '升至 5 级')
    assert.equal(metadata.playerHistoryNextAction, '查看城内事务')
    assert.equal(metadata.playerHistorySeverity, 'low')
    assert.equal(metadata.playerHistoryScope, 'own_faction')
    assert.equal(metadata.playerHistoryFactionId, 'player')
    assert.equal(typeof metadata.playerHistoryDedupeKey, 'string')

    const anonymousHistory = await requestJson(baseUrl, '/api/player-history?limit=20&eventLimit=20&civilMemoryLimit=5', 'GET')
    assert.equal(anonymousHistory.status, 200, `anonymous player-history route failed: ${JSON.stringify(anonymousHistory.data)}`)
    const anonymousCards = readArray(readObject(readObject(anonymousHistory.data).timeline).cards).map((item) => readObject(item))
    assert.equal(
      anonymousCards.some((card) => card.category === 'economy_city' && card.title === '设施升级完成'),
      false,
      'anonymous player history must not expose the own-faction economy receipt card',
    )

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: 'main_city_economy_owner',
    })
    assert.equal(join.status, 200, `session join failed: ${JSON.stringify(join.data)}`)
    const token = String(readObject(join.data).token)
    assert.ok(token.length > 0, 'session join should return a bearer token')

    const history = await requestJsonWithBearer(
      baseUrl,
      '/api/player-history?factionId=player&limit=20&eventLimit=20&civilMemoryLimit=5',
      token,
    )
    assert.equal(history.status, 200, `player-history route failed: ${JSON.stringify(history.data)}`)
    const cards = readArray(readObject(readObject(history.data).timeline).cards).map((item) => readObject(item))
    const economyCard = cards.find((card) => card.category === 'economy_city' && card.title === '设施升级完成')
    assert.ok(economyCard, 'player history should expose the main-city economy receipt card')
    assert.equal(economyCard.actorName, '主城内府')
    assert.equal(economyCard.locationLabel, '主城')
    assert.equal(economyCard.targetLabel, '税务府')
    assert.equal(economyCard.resultLabel, '升至 5 级')
    assert.equal(economyCard.nextActionLabel, '查看城内事务')

    const visiblePayload = visibleCardText(economyCard)
    for (const required of ['设施升级完成', '主城内府', '税务府', '升至 5 级', '查看城内事务']) {
      assert.ok(visiblePayload.includes(required), `economy/city visible copy should include ${required}`)
    }
    for (const forbidden of [
      'promoteCityBuilding',
      'promote_city_building',
      'resourcesSpent',
      'readModelRefresh',
      '/api/world/main-city/facility-tree',
      'tax_office',
      'tile_08',
      'main_city',
      'schema',
      'read model',
      'backend',
      'metadata',
      'fixture',
      'gate',
      'debug',
      'snake_case',
    ]) {
      assert.equal(visiblePayload.includes(forbidden), false, `economy/city visible copy leaked implementation term: ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

runMainCityEconomyReceiptContract().then(() => {
  console.log('[player_history_main_city_economy_receipt_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_main_city_economy_receipt_contract] failed:', error)
  process.exitCode = 1
})
