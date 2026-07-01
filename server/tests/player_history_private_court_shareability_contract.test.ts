import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { WorldEventRecord } from '../../shared/contracts/game'
import { buildPlayerWorldTimelineReadModel } from '../../shared/domain/playerHistory'
import { filterPlayerHistoryEventsForViewer } from '../src/routes/playerHistory'

const SHARE_SECRET = 'local-player-history-share-token-secret'
const COURT_EVENT_ID = 'private-court-event-1'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function buildShareToken(eventId: string, expiresAtMs: number) {
  const signature = createHmac('sha256', SHARE_SECRET)
    .update(`${eventId}.${expiresAtMs}`)
    .digest('base64url')
  return `player_history_share_v1.${expiresAtMs}.${signature}`
}

const privateCourtEvent: WorldEventRecord = {
  id: COURT_EVENT_ID,
  category: 'world_action',
  action: 'preview_court_session',
  success: true,
  tick: 13,
  worldVersion: 21,
  createdAt: '2026-06-13T00:00:00.000Z',
  metadata: {
    factionId: 'player',
    playerHistoryCategory: 'court',
    playerHistoryTitle: '决议待执行',
    playerHistoryActorName: '洛阳朝议',
    playerHistorySummary: '朝议通过前线调度，等待执行结果回报。',
    playerHistoryLocation: '洛阳',
    playerHistoryTarget: '前线调度',
    playerHistoryResultLabel: '待执行',
    playerHistoryConsequence: '当前世界状态尚未改变，需等待正式执行回执。',
    playerHistoryNextAction: '查看朝议',
    playerHistorySeverity: 'medium',
    playerHistoryScope: 'private_court',
    playerHistoryFactionId: 'player',
    playerHistorySharePolicy: 'not_shareable_private',
    playerHistoryShareStateLabel: '暂不可分享',
    playerHistoryDedupeKey: 'court:private-court-event-1:pending',
  },
}

const anonymous = filterPlayerHistoryEventsForViewer([privateCourtEvent], {})
assert.deepEqual(anonymous.events, [], 'private Court cards should be hidden from anonymous readers')

const owner = filterPlayerHistoryEventsForViewer([privateCourtEvent], { factionId: 'player' })
assert.deepEqual(owner.events.map((event) => event.id), [COURT_EVENT_ID], 'own faction should see private Court cards')

const wrongOwner = filterPlayerHistoryEventsForViewer([privateCourtEvent], { factionId: 'neutral' })
assert.deepEqual(wrongOwner.events, [], 'other faction should not see private Court cards')

const shareToken = buildShareToken(COURT_EVENT_ID, Date.now() + 5_000)
const shared = filterPlayerHistoryEventsForViewer([privateCourtEvent], {
  explicitSpectatorShareToken: shareToken,
})
assert.deepEqual(shared.events, [], 'explicit spectator token must not expose private Court without explicit shareable policy')

const timeline = buildPlayerWorldTimelineReadModel({
  generatedAt: '2026-06-13T00:00:00.000Z',
  events: owner.events,
  limit: 5,
})
const courtCard = timeline.cards[0]
assert.equal(courtCard.category, 'court')
assert.equal(courtCard.sharePolicy, undefined, 'private Court must not become a shareable timeline card')
assert.equal(courtCard.shareStateLabel, '暂不可分享')

const visiblePayload = JSON.stringify(courtCard)
for (const forbidden of [
  'not_shareable_private',
  'private_court',
  'playerHistorySharePolicy',
  'shareToken',
  'player_history_share_v1',
  'Authorization',
  'Bearer',
  'HMAC',
  'signature',
  'proposalId',
  'resolutionId',
  'seatId',
  'execute:',
  'hold:',
  'debug',
  'ops',
]) {
  assert.equal(visiblePayload.includes(forbidden), false, `private Court visible card leaked ${forbidden}`)
}

const worldService = read('server/src/application/world/WorldService.ts')
for (const producerFact of [
  "playerHistoryScope: 'private_court'",
  "playerHistoryFactionId: 'player'",
  "playerHistorySharePolicy: 'not_shareable_private'",
  "playerHistoryShareStateLabel: '暂不可分享'",
]) {
  assert.ok(worldService.includes(producerFact), `Court producer should annotate private shareability: ${producerFact}`)
}

const receiptContract = read('server/tests/court_decision_world_effect_receipt_contract.test.ts')
for (const receiptFact of [
  "metadata.playerHistoryScope, 'private_court'",
  "metadata.playerHistorySharePolicy, 'not_shareable_private'",
  "metadata.playerHistoryShareStateLabel, '暂不可分享'",
]) {
  assert.ok(receiptContract.includes(receiptFact), `Court receipt contract should prove ${receiptFact}`)
}

const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const handoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
assert.ok(
  packageJson.includes('"test:world:player-history-private-court-shareability-contract"'),
  'package.json must expose private Court shareability contract',
)
assert.ok(
  authority.includes('Stage 569 player-history private Court shareability status') &&
    authority.includes('`npm.cmd run test:world:player-history-private-court-shareability-contract`') &&
    handoff.includes('Stage 569 - player-history private Court shareability'),
  'authority and CURRENT handoff must record Stage 569 private Court shareability gate',
)

console.log('[player_history_private_court_shareability_contract] all checks passed')
