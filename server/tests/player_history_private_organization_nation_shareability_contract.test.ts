import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { WorldEventRecord } from '../../shared/contracts/game'
import { buildPlayerWorldTimelineReadModel } from '../../shared/domain/playerHistory'
import { filterPlayerHistoryEventsForViewer } from '../src/routes/playerHistory'

const SHARE_SECRET = 'local-player-history-share-token-secret'
const ORGANIZATION_EVENT_ID = 'private-organization-nation-event-1'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function buildShareToken(eventId: string, expiresAtMs: number) {
  const signature = createHmac('sha256', SHARE_SECRET)
    .update(`${eventId}.${expiresAtMs}`)
    .digest('base64url')
  return `player_history_share_v1.${expiresAtMs}.${signature}`
}

const organizationNationEvent: WorldEventRecord = {
  id: ORGANIZATION_EVENT_ID,
  category: 'world_action',
  action: 'record_nation_midgame_realm_objective_bridge',
  success: true,
  tick: 21,
  worldVersion: 31,
  createdAt: '2026-06-13T00:00:00.000Z',
  metadata: {
    factionId: 'player',
    organizationId: 'player',
    playerHistoryCategory: 'organization_nation',
    playerHistoryTitle: '同盟目标推进',
    playerHistoryActorName: '青州同盟',
    playerHistorySummary: '王国目标已接入组织目标，下一步巩固洛阳。',
    playerHistoryLocation: '洛阳',
    playerHistoryTarget: '王国目标',
    playerHistoryResultLabel: '已推进',
    playerHistoryConsequence: '王国与帝国前置目标已更新，成员可以围绕新目标继续行动。',
    playerHistoryNextAction: '查看同盟目标',
    playerHistorySeverity: 'medium',
    playerHistoryScope: 'own_organization',
    playerHistorySharePolicy: 'not_shareable_private',
    playerHistoryShareStateLabel: '暂不可分享',
    playerHistoryDedupeKey: 'organization-nation:realm-objective:private-organization-nation-event-1',
  },
}

const anonymous = filterPlayerHistoryEventsForViewer([organizationNationEvent], {})
assert.deepEqual(anonymous.events, [], 'organization/nation event should be hidden from anonymous readers')

const ownerOrganization = filterPlayerHistoryEventsForViewer([organizationNationEvent], {
  factionId: 'player',
  organizationIds: ['player'],
})
assert.deepEqual(
  ownerOrganization.events.map((event) => event.id),
  [ORGANIZATION_EVENT_ID],
  'own organization member should see organization/nation event',
)

const wrongOrganization = filterPlayerHistoryEventsForViewer([organizationNationEvent], {
  factionId: 'neutral',
  organizationIds: ['neutral'],
})
assert.deepEqual(wrongOrganization.events, [], 'other organization should not see organization/nation event')

const shareToken = buildShareToken(ORGANIZATION_EVENT_ID, Date.now() + 5_000)
const shared = filterPlayerHistoryEventsForViewer([organizationNationEvent], {
  explicitSpectatorShareToken: shareToken,
})
assert.deepEqual(
  shared.events,
  [],
  'explicit spectator token must not expose organization/nation event without explicit shareable policy',
)

const timeline = buildPlayerWorldTimelineReadModel({
  generatedAt: '2026-06-13T00:00:00.000Z',
  events: ownerOrganization.events,
  limit: 5,
})
const orgCard = timeline.cards[0]
assert.equal(orgCard.category, 'organization_nation')
assert.equal(orgCard.sharePolicy, undefined, 'organization/nation private card must not become shareable')
assert.equal(orgCard.shareStateLabel, '暂不可分享')

const visiblePayload = JSON.stringify(orgCard)
for (const forbidden of [
  'not_shareable_private',
  'own_organization',
  'playerHistorySharePolicy',
  'shareToken',
  'player_history_share_v1',
  'Authorization',
  'Bearer',
  'realmObjectiveProgressId',
  'sourceControlAuthorityId',
  'sourceLuoyangControlProgressId',
  'debug',
  'ops',
]) {
  assert.equal(visiblePayload.includes(forbidden), false, `organization/nation visible card leaked ${forbidden}`)
}

const worldService = read('server/src/application/world/WorldService.ts')
for (const producerFact of [
  "playerHistoryScope: 'own_organization'",
  "playerHistorySharePolicy: 'not_shareable_private'",
  "playerHistoryShareStateLabel: '暂不可分享'",
]) {
  assert.ok(worldService.includes(producerFact), `organization/nation producer should annotate private shareability: ${producerFact}`)
}

const producerContract = read('server/tests/player_history_organization_nation_realm_objective_producer_contract.test.ts')
for (const producerContractFact of [
  "metadata.playerHistoryScope, 'own_organization'",
  "metadata.playerHistorySharePolicy, 'not_shareable_private'",
  "metadata.playerHistoryShareStateLabel, '暂不可分享'",
  'requestJsonWithBearer',
]) {
  assert.ok(producerContract.includes(producerContractFact), `organization/nation producer contract should prove ${producerContractFact}`)
}

const packageJson = read('package.json')
assert.ok(
  packageJson.includes('"test:world:player-history-private-organization-nation-shareability-contract"'),
  'package.json must expose private organization/nation shareability contract',
)

console.log('[player_history_private_organization_nation_shareability_contract] all checks passed')
