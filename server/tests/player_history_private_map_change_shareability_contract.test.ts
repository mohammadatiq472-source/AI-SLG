import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { WorldEventRecord } from '../../shared/contracts/game'
import { buildPlayerWorldTimelineReadModel } from '../../shared/domain/playerHistory'
import { filterPlayerHistoryEventsForViewer } from '../src/routes/playerHistory'

const SHARE_SECRET = 'local-player-history-share-token-secret'
const MAP_EVENT_ID = 'private-map-change-event-1'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function buildShareToken(eventId: string, expiresAtMs: number) {
  const signature = createHmac('sha256', SHARE_SECRET)
    .update(`${eventId}.${expiresAtMs}`)
    .digest('base64url')
  return `player_history_share_v1.${expiresAtMs}.${signature}`
}

const privateMapChangeEvent: WorldEventRecord = {
  id: MAP_EVENT_ID,
  category: 'world_action',
  action: 'claim_main_map_cell',
  success: true,
  tick: 10,
  worldVersion: 15,
  createdAt: '2026-06-13T00:00:00.000Z',
  metadata: {
    factionId: 'player',
    playerHistoryCategory: 'map_change',
    playerHistoryTitle: '地块已占领',
    playerHistoryActorName: '青州军',
    playerHistorySummary: '前线地块已归入我方控制，周边行动可以继续推进。',
    playerHistoryLocation: '主地图前线',
    playerHistoryTarget: '前线地块',
    playerHistoryResultLabel: '已占领',
    playerHistoryConsequence: '该地块已写入地图归属，后续可从地图继续查看。',
    playerHistoryNextAction: '查看地图',
    playerHistorySeverity: 'low',
    playerHistoryScope: 'private_map',
    playerHistoryFactionId: 'player',
    playerHistorySharePolicy: 'not_shareable_private',
    playerHistoryShareStateLabel: '暂不可分享',
    playerHistoryDedupeKey: 'map-change:private-map-change-event-1:player:15',
  },
}

const anonymous = filterPlayerHistoryEventsForViewer([privateMapChangeEvent], {})
assert.deepEqual(anonymous.events, [], 'private map-change should be hidden from anonymous readers')

const owner = filterPlayerHistoryEventsForViewer([privateMapChangeEvent], { factionId: 'player' })
assert.deepEqual(owner.events.map((event) => event.id), [MAP_EVENT_ID], 'own faction should see private map-change')

const wrongOwner = filterPlayerHistoryEventsForViewer([privateMapChangeEvent], { factionId: 'neutral' })
assert.deepEqual(wrongOwner.events, [], 'other faction should not see private map-change')

const shareToken = buildShareToken(MAP_EVENT_ID, Date.now() + 5_000)
const shared = filterPlayerHistoryEventsForViewer([privateMapChangeEvent], {
  explicitSpectatorShareToken: shareToken,
})
assert.deepEqual(shared.events, [], 'explicit spectator token must not expose private map-change without explicit shareable policy')

const timeline = buildPlayerWorldTimelineReadModel({
  generatedAt: '2026-06-13T00:00:00.000Z',
  events: owner.events,
  limit: 5,
})
const mapCard = timeline.cards[0]
assert.equal(mapCard.category, 'map_change')
assert.equal(mapCard.sharePolicy, undefined, 'private map-change must not become a shareable timeline card')
assert.equal(mapCard.shareStateLabel, '暂不可分享')

const visiblePayload = JSON.stringify(mapCard)
for (const forbidden of [
  'not_shareable_private',
  'private_map',
  'playerHistorySharePolicy',
  'shareToken',
  'player_history_share_v1',
  'Authorization',
  'Bearer',
  'cellId',
  'chunkId',
  'cellX',
  'cellY',
  'debug',
  'ops',
]) {
  assert.equal(visiblePayload.includes(forbidden), false, `private map-change visible card leaked ${forbidden}`)
}

const worldService = read('server/src/application/world/WorldService.ts')
for (const producerFact of [
  "playerHistoryScope: 'private_map'",
  'playerHistoryFactionId: params.factionId',
  "playerHistorySharePolicy: 'not_shareable_private'",
  "playerHistoryShareStateLabel: '暂不可分享'",
]) {
  assert.ok(worldService.includes(producerFact), `map-change producer should annotate private shareability: ${producerFact}`)
}

const mapProducerContract = read('server/tests/player_history_map_change_main_map_cell_producer_contract.test.ts')
for (const producerContractFact of [
  "metadata.playerHistoryScope, 'private_map'",
  "metadata.playerHistorySharePolicy, 'not_shareable_private'",
  "metadata.playerHistoryShareStateLabel, '暂不可分享'",
  'requestJsonWithBearer',
]) {
  assert.ok(mapProducerContract.includes(producerContractFact), `map-change producer contract should prove ${producerContractFact}`)
}

const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const handoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
assert.ok(
  packageJson.includes('"test:world:player-history-private-map-change-shareability-contract"'),
  'package.json must expose private map-change shareability contract',
)
assert.ok(
  authority.includes('Stage 572 player-history private map-change shareability status') &&
    authority.includes('`npm.cmd run test:world:player-history-private-map-change-shareability-contract`') &&
    handoff.includes('Stage 572 - player-history private map-change shareability'),
  'authority and CURRENT handoff must record Stage 572 private map-change shareability gate',
)

console.log('[player_history_private_map_change_shareability_contract] all checks passed')
