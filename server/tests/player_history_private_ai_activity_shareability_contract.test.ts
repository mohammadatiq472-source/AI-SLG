import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { WorldEventRecord } from '../../shared/contracts/game'
import { buildPlayerWorldTimelineReadModel } from '../../shared/domain/playerHistory'
import { filterPlayerHistoryEventsForViewer } from '../src/routes/playerHistory'

const SHARE_SECRET = 'local-player-history-share-token-secret'
const AI_EVENT_ID = 'private-ai-activity-event-1'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function buildShareToken(eventId: string, expiresAtMs: number) {
  const signature = createHmac('sha256', SHARE_SECRET)
    .update(`${eventId}.${expiresAtMs}`)
    .digest('base64url')
  return `player_history_share_v1.${expiresAtMs}.${signature}`
}

const privateAiActivityEvent: WorldEventRecord = {
  id: AI_EVENT_ID,
  category: 'planning',
  action: 'append_planning_history',
  success: true,
  tick: 9,
  worldVersion: 14,
  createdAt: '2026-06-13T00:00:00.000Z',
  metadata: {
    factionId: 'player',
    playerHistoryCategory: 'ai_activity',
    playerHistoryTitle: 'AI 行动已完成',
    playerHistoryActorName: '军师 AI',
    playerHistorySummary: '前线补给巡查已经进入 AI 活动记录。',
    playerHistoryLocation: '虎牢前线',
    playerHistoryTarget: '安排前线补给巡查',
    playerHistoryResultLabel: '已推进',
    playerHistoryConsequence: '执行记录已进入活动时间线。',
    playerHistoryNextAction: '查看 AI 活动',
    playerHistorySeverity: 'low',
    playerHistoryScope: 'private_ai',
    playerHistoryFactionId: 'player',
    playerHistorySharePolicy: 'not_shareable_private',
    playerHistoryShareStateLabel: '暂不可分享',
    playerHistoryDedupeKey: 'ai-activity:planning:private-ai-activity-event-1:succeeded',
  },
}

const anonymous = filterPlayerHistoryEventsForViewer([privateAiActivityEvent], {})
assert.deepEqual(anonymous.events, [], 'private AI activity should be hidden from anonymous readers')

const owner = filterPlayerHistoryEventsForViewer([privateAiActivityEvent], { factionId: 'player' })
assert.deepEqual(owner.events.map((event) => event.id), [AI_EVENT_ID], 'own faction should see private AI activity')

const wrongOwner = filterPlayerHistoryEventsForViewer([privateAiActivityEvent], { factionId: 'neutral' })
assert.deepEqual(wrongOwner.events, [], 'other faction should not see private AI activity')

const shareToken = buildShareToken(AI_EVENT_ID, Date.now() + 5_000)
const shared = filterPlayerHistoryEventsForViewer([privateAiActivityEvent], {
  explicitSpectatorShareToken: shareToken,
})
assert.deepEqual(shared.events, [], 'explicit spectator token must not expose private AI activity without explicit shareable policy')

const timeline = buildPlayerWorldTimelineReadModel({
  generatedAt: '2026-06-13T00:00:00.000Z',
  events: owner.events,
  limit: 5,
})
const aiCard = timeline.cards[0]
assert.equal(aiCard.category, 'ai_activity')
assert.equal(aiCard.sharePolicy, undefined, 'private AI activity must not become a shareable timeline card')
assert.equal(aiCard.shareStateLabel, '暂不可分享')

const visiblePayload = JSON.stringify(aiCard)
for (const forbidden of [
  'not_shareable_private',
  'private_ai',
  'playerHistorySharePolicy',
  'shareToken',
  'player_history_share_v1',
  'Authorization',
  'Bearer',
  'provider',
  'plannerDecision',
  'debug',
  'ops',
]) {
  assert.equal(visiblePayload.includes(forbidden), false, `private AI activity visible card leaked ${forbidden}`)
}

const worldService = read('server/src/application/world/WorldService.ts')
for (const producerFact of [
  "playerHistoryScope: 'private_ai'",
  "playerHistoryFactionId: 'player'",
  "playerHistorySharePolicy: 'not_shareable_private'",
  "playerHistoryShareStateLabel: '暂不可分享'",
]) {
  assert.ok(worldService.includes(producerFact), `AI activity producer should annotate private shareability: ${producerFact}`)
}

const aiProducerContract = read('server/tests/player_history_ai_activity_planning_producer_contract.test.ts')
for (const producerContractFact of [
  "metadata.playerHistoryScope, 'private_ai'",
  "metadata.playerHistorySharePolicy, 'not_shareable_private'",
  "metadata.playerHistoryShareStateLabel, '暂不可分享'",
  'requestJsonWithBearer',
]) {
  assert.ok(aiProducerContract.includes(producerContractFact), `AI activity producer contract should prove ${producerContractFact}`)
}

const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const handoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
assert.ok(
  packageJson.includes('"test:world:player-history-private-ai-activity-shareability-contract"'),
  'package.json must expose private AI activity shareability contract',
)
assert.ok(
  authority.includes('Stage 571 player-history private AI activity shareability status') &&
    authority.includes('`npm.cmd run test:world:player-history-private-ai-activity-shareability-contract`') &&
    handoff.includes('Stage 571 - player-history private AI activity shareability'),
  'authority and CURRENT handoff must record Stage 571 private AI activity shareability gate',
)

console.log('[player_history_private_ai_activity_shareability_contract] all checks passed')
