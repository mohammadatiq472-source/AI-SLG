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

const WORLD_ID = 'unified_aoi_v0_6_formal_real_map_data_1km'
const COORDINATE_SPACE = 'real_map_data_1km.cell_1km'

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

async function runMapChangeMainMapCellProducerContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail)

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

    const claim = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'claimMainMapCell',
      payload: {
        worldId: WORLD_ID,
        coordinateSpace: COORDINATE_SPACE,
        factionId: 'player',
        requestId: 'map_change_main_map_cell_stage_506',
        cellX: 32,
        cellY: 32,
        expectedOwner: 'neutral',
      },
    }, 60_000)
    assert.equal(claim.status, 200, `claimMainMapCell route failed: ${JSON.stringify(claim.data)}`)
    const claimPayload = readObject(claim.data)
    assert.equal(claimPayload.ok, true, `claimMainMapCell should succeed: ${JSON.stringify(claimPayload)}`)
    const receipt = readObject(claimPayload.receipt)
    assert.equal(receipt.action, 'claimMainMapCell')
    assert.equal(receipt.previousOwner, 'neutral')
    assert.equal(receipt.nextOwner, 'player')
    assert.equal(typeof receipt.cellId, 'string')
    assert.equal(typeof receipt.chunkId, 'string')

    const events = await requestJson(baseUrl, '/api/events?limit=20', 'GET')
    assert.equal(events.status, 200, `events route failed: ${JSON.stringify(events.data)}`)
    const eventItems = readArray(readObject(events.data).items ?? readObject(events.data).events).map((item) => readObject(item))
    const mapEvent = eventItems.find((item) => item.action === 'claim_main_map_cell' && item.success === true)
    assert.ok(mapEvent, 'runtime events should include successful claim_main_map_cell')
    const metadata = readObject(readObject(mapEvent).metadata)
    assert.equal(metadata.playerHistoryCategory, 'map_change')
    assert.equal(metadata.playerHistoryTitle, '地块已占领')
    assert.equal(metadata.playerHistoryActorName, '青州军')
    assert.equal(metadata.playerHistoryLocation, '主地图前线')
    assert.equal(metadata.playerHistoryTarget, '前线地块')
    assert.equal(metadata.playerHistoryResultLabel, '已占领')
    assert.equal(metadata.playerHistoryNextAction, '查看地图')
    assert.equal(metadata.playerHistorySeverity, 'low')
    assert.equal(metadata.playerHistoryScope, 'private_map')
    assert.equal(metadata.playerHistoryFactionId, 'player')
    assert.equal(metadata.playerHistorySharePolicy, 'not_shareable_private')
    assert.equal(metadata.playerHistoryShareStateLabel, '暂不可分享')
    assert.equal(typeof metadata.playerHistoryDedupeKey, 'string')
    assert.equal(metadata.previousOwner, 'neutral')
    assert.equal(metadata.nextOwner, 'player')

    const history = await requestJsonWithBearer(baseUrl, '/api/player-history?limit=20&eventLimit=20&civilMemoryLimit=5', sessionToken)
    assert.equal(history.status, 200, `player-history route failed: ${JSON.stringify(history.data)}`)
    const timeline = readObject(readObject(history.data).timeline)
    const cards = readArray(timeline.cards).map((item) => readObject(item))
    const mapCard = cards.find((card) => card.category === 'map_change' && card.title === '地块已占领')
    assert.ok(mapCard, 'player history should expose main-map cell claim as a map-change card')
    assert.equal(mapCard.actorName, '青州军')
    assert.equal(mapCard.locationLabel, '主地图前线')
    assert.equal(mapCard.targetLabel, '前线地块')
    assert.equal(mapCard.resultLabel, '已占领')
    assert.equal(mapCard.nextActionLabel, '查看地图')
    assert.equal(mapCard.sharePolicy, undefined, 'private map-change cards should not become shareable')
    assert.equal(mapCard.shareStateLabel, '暂不可分享')

    const visiblePayload = visibleCardText(mapCard)
    for (const required of ['地块已占领', '青州军', '主地图前线', '前线地块', '查看地图']) {
      assert.ok(visiblePayload.includes(required), `map-change visible copy should include ${required}`)
    }
    for (const forbidden of [
      WORLD_ID,
      COORDINATE_SPACE,
      '8070',
      '7390',
      '59,637,300',
      '5963万',
      'cellId',
      'chunkId',
      'cellX',
      'cellY',
      String(receipt.cellId),
      String(receipt.chunkId),
      'claimMainMapCell',
      'claim_main_map_cell',
      'tileChanges',
      'main_map_owner_delta',
      'metadata',
      'schema',
      'contract',
      'read model',
      'backend',
      'route',
      'fixture',
      'gate',
      'debug',
      'snake_case',
    ]) {
      assert.equal(visiblePayload.includes(forbidden), false, `map-change visible copy leaked implementation term: ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

runMapChangeMainMapCellProducerContract().then(() => {
  console.log('[player_history_map_change_main_map_cell_producer_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_map_change_main_map_cell_producer_contract] failed:', error)
  process.exitCode = 1
})
