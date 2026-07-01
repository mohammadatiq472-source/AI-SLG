import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { WorldEventRecord } from '../../shared/contracts/game'
import { buildPlayerWorldTimelineReadModel } from '../../shared/domain/playerHistory'
import { filterPlayerHistoryEventsForViewer } from '../src/routes/playerHistory'

const SHARE_SECRET = 'local-player-history-share-token-secret'
const DIPLOMACY_EVENT_ID = 'private-diplomacy-event-1'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function buildShareToken(eventId: string, expiresAtMs: number) {
  const signature = createHmac('sha256', SHARE_SECRET)
    .update(`${eventId}.${expiresAtMs}`)
    .digest('base64url')
  return `player_history_share_v1.${expiresAtMs}.${signature}`
}

const privateDiplomacyEvent: WorldEventRecord = {
  id: DIPLOMACY_EVENT_ID,
  category: 'world_action',
  action: 'diplomacy_propose',
  success: true,
  tick: 11,
  worldVersion: 18,
  createdAt: '2026-06-13T00:00:00.000Z',
  metadata: {
    factionId: 'player',
    playerHistoryCategory: 'diplomacy',
    playerHistoryTitle: '同盟交涉已发起',
    playerHistoryActorName: '青州同盟',
    playerHistorySummary: '青州同盟向幽州势力提出边境停火。',
    playerHistoryTarget: '幽州势力',
    playerHistoryResultLabel: '待回应',
    playerHistoryConsequence: '边境战事可能改变，仍需等待对方答复。',
    playerHistoryNextAction: '查看外交',
    playerHistorySeverity: 'medium',
    playerHistoryScope: 'organization_scope',
    playerHistoryOrganizationId: 'player',
    playerHistorySharePolicy: 'not_shareable_private',
    playerHistoryShareStateLabel: '暂不可分享',
    playerHistoryDedupeKey: 'diplomacy:private-diplomacy-event-1:proposed',
  },
}

const anonymous = filterPlayerHistoryEventsForViewer([privateDiplomacyEvent], {})
assert.deepEqual(anonymous.events, [], 'private diplomacy should be hidden from anonymous player-history readers')

const owner = filterPlayerHistoryEventsForViewer([privateDiplomacyEvent], {
  factionId: 'player',
  organizationIds: ['player'],
})
assert.deepEqual(owner.events.map((event) => event.id), [DIPLOMACY_EVENT_ID], 'own organization reader should see private diplomacy')

const wrongOwner = filterPlayerHistoryEventsForViewer([privateDiplomacyEvent], {
  factionId: 'neutral',
  organizationIds: ['neutral'],
})
assert.deepEqual(wrongOwner.events, [], 'other organization reader should not see private diplomacy')

const shareToken = buildShareToken(DIPLOMACY_EVENT_ID, Date.now() + 5_000)
const shared = filterPlayerHistoryEventsForViewer([privateDiplomacyEvent], {
  explicitSpectatorShareToken: shareToken,
})
assert.deepEqual(shared.events, [], 'explicit spectator token must not expose private diplomacy without explicit shareable policy')

const timeline = buildPlayerWorldTimelineReadModel({
  generatedAt: '2026-06-13T00:00:00.000Z',
  events: owner.events,
  limit: 5,
})
const diplomacyCard = timeline.cards[0]
assert.equal(diplomacyCard.category, 'diplomacy')
assert.equal(diplomacyCard.sharePolicy, undefined, 'private diplomacy must not become a shareable timeline card')
assert.equal(diplomacyCard.shareStateLabel, '暂不可分享')

const visiblePayload = JSON.stringify(diplomacyCard)
for (const forbidden of [
  'not_shareable_private',
  'organization_scope',
  'playerHistorySharePolicy',
  'shareToken',
  'player_history_share_v1',
  'Authorization',
  'Bearer',
  'HMAC',
  'signature',
  'proposalId',
  'proposerId',
  'targetId',
  'debug',
  'ops',
]) {
  assert.equal(visiblePayload.includes(forbidden), false, `private diplomacy visible card leaked ${forbidden}`)
}

const playerHistoryDomain = read('shared/domain/playerHistory.ts')
for (const domainFact of [
  "return readMetadataString(event, 'playerHistorySharePolicy') === 'explicit_spectator' ? 'explicit_spectator' : undefined",
  "shareStateLabel: readMetadataString(event, 'playerHistoryShareStateLabel')",
]) {
  assert.ok(playerHistoryDomain.includes(domainFact), `player-history domain should keep private share policy non-shareable: ${domainFact}`)
}

const playerHistoryRoute = read('server/src/routes/playerHistory.ts')
for (const routeFact of [
  "scope === 'organization_scope'",
  "readEventMetadataString(event, 'playerHistorySharePolicy') === 'explicit_spectator'",
]) {
  assert.ok(playerHistoryRoute.includes(routeFact), `player-history route should prove private diplomacy access boundary: ${routeFact}`)
}

const diplomacyRoute = read('server/src/routes/diplomacy.ts')
for (const producerFact of [
  "playerHistoryScope: 'organization_scope'",
  "playerHistorySharePolicy: 'not_shareable_private'",
  "playerHistoryShareStateLabel: '暂不可分享'",
]) {
  assert.ok(diplomacyRoute.includes(producerFact), `diplomacy producer should annotate private shareability: ${producerFact}`)
}

const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const handoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
assert.ok(
  packageJson.includes('"test:world:player-history-private-diplomacy-shareability-contract"'),
  'package.json must expose private diplomacy shareability contract',
)
assert.ok(
  authority.includes('Stage 568 player-history private diplomacy shareability status') &&
    authority.includes('`npm.cmd run test:world:player-history-private-diplomacy-shareability-contract`') &&
    handoff.includes('Stage 568 - player-history private diplomacy shareability'),
  'authority and CURRENT handoff must record Stage 568 private diplomacy shareability gate',
)

console.log('[player_history_private_diplomacy_shareability_contract] all checks passed')
