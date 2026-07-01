import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import type { WorldEventRecord } from '../../shared/contracts/game'
import { buildPlayerWorldTimelineReadModel } from '../../shared/domain/playerHistory'
import { filterPlayerHistoryEventsForViewer } from '../src/routes/playerHistory'

const SHARE_SECRET = 'local-player-history-share-token-secret'
const SHARED_EVENT_ID = 'explicit-spectator-event-1'

function buildShareToken(eventId: string, expiresAtMs: number) {
  const signature = createHmac('sha256', SHARE_SECRET)
    .update(`${eventId}.${expiresAtMs}`)
    .digest('base64url')
  return `player_history_share_v1.${expiresAtMs}.${signature}`
}

function buildExplicitSpectatorReadModel(shareToken?: string) {
  const events = [
    buildEvent({
      id: 'public-event',
      title: '天下公告',
      scope: 'public_world',
    }),
    buildEvent({
      id: SHARED_EVENT_ID,
      title: '共享战况摘录',
      scope: 'explicit_spectator',
    }),
  ]
  const scoped = filterPlayerHistoryEventsForViewer(events, { explicitSpectatorShareToken: shareToken })
  return buildPlayerWorldTimelineReadModel({
    generatedAt: '2026-06-13T00:00:00.000Z',
    events: scoped.events,
    notificationAnchors: scoped.notificationAnchors,
    limit: 20,
  })
}

function visibleTitlesFor(shareToken?: string) {
  return buildExplicitSpectatorReadModel(shareToken).cards.map((card) => card.title)
}

const noTokenTitles = visibleTitlesFor()
assert.deepEqual(noTokenTitles, ['天下公告'], 'explicit spectator card should be hidden without share token')

const wrongTokenTitles = visibleTitlesFor(buildShareToken('other-event', Date.now() + 5_000))
assert.deepEqual(wrongTokenTitles, ['天下公告'], 'explicit spectator card should be hidden with wrong share token')

const expiredTokenTitles = visibleTitlesFor(buildShareToken(SHARED_EVENT_ID, Date.now() - 1))
assert.deepEqual(expiredTokenTitles, ['天下公告'], 'explicit spectator card should be hidden with expired share token')

const validShareToken = buildShareToken(SHARED_EVENT_ID, Date.now() + 5_000)
assert.equal(validShareToken.includes(SHARED_EVENT_ID), false, 'share token must not expose raw event id')
const sharedTitles = visibleTitlesFor(validShareToken)
assert.deepEqual(sharedTitles, ['天下公告', '共享战况摘录'], 'signed exact share token should expose explicit spectator card')

const sharedReadModel = buildExplicitSpectatorReadModel(validShareToken)
const visiblePayload = JSON.stringify(sharedReadModel.cards)
for (const forbidden of [
  'explicit_spectator',
  'shareToken',
  'player_history_share_v1',
  'Authorization',
  'Bearer',
  'token',
  'signature',
  'HMAC',
  'debug',
  'ops',
  'snake_case',
]) {
  assert.equal(visiblePayload.includes(forbidden), false, `explicit spectator visible card leaked ${forbidden}`)
}

function buildEvent(input: {
  id: string
  title: string
  scope: string
}): WorldEventRecord {
  return {
    id: input.id,
    category: 'planning',
    action: 'explicit_spectator_share_fixture',
    success: true,
    tick: 1,
    worldVersion: 1,
    createdAt: '2026-06-13T00:00:00.000Z',
    metadata: {
      playerHistoryScope: input.scope,
      playerHistoryCategory: 'battle',
      playerHistoryTitle: input.title,
      playerHistoryActorName: '青州军',
      playerHistorySummary: `${input.title}已开放只读摘录。`,
      playerHistoryResultLabel: '已开放',
      playerHistoryConsequence: '可查看共享上下文',
      playerHistoryNextAction: '查看共享记录',
      playerHistorySeverity: 'medium',
    },
  }
}

console.log('[player_history_explicit_spectator_share_grant_runtime_contract] all checks passed')
