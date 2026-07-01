import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { WorldEventRecord } from '../../shared/contracts/game'
import { buildPlayerWorldTimelineReadModel } from '../../shared/domain/playerHistory'
import { filterPlayerHistoryEventsForViewer } from '../src/routes/playerHistory'

const SHARE_SECRET = 'local-player-history-share-token-secret'
const SHAREABLE_EVENT_ID = 'real-shareable-battle-event-1'
const UNSHAREABLE_EVENT_ID = 'private-unshareable-event-1'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function buildShareToken(eventId: string, expiresAtMs: number) {
  const signature = createHmac('sha256', SHARE_SECRET)
    .update(`${eventId}.${expiresAtMs}`)
    .digest('base64url')
  return `player_history_share_v1.${expiresAtMs}.${signature}`
}

function buildEvent(input: {
  id: string
  shareable: boolean
}): WorldEventRecord {
  return {
    id: input.id,
    category: 'world_action',
    action: input.shareable ? 'real_shareable_battle_result' : 'private_unshareable_result',
    success: true,
    tick: 7,
    worldVersion: 12,
    createdAt: '2026-06-13T00:00:00.000Z',
    metadata: {
      factionId: 'player',
      playerHistoryCategory: 'battle',
      playerHistoryTitle: input.shareable ? '战斗已结束' : '密令已记录',
      playerHistoryActorName: '青州军',
      playerHistorySummary: '真实世界事件已经结算。',
      playerHistoryTarget: '前线',
      playerHistoryResultLabel: '胜利',
      playerHistoryConsequence: '结果已经写入世界状态。',
      playerHistoryNextAction: '查看战报',
      playerHistorySeverity: 'medium',
      playerHistoryScope: 'own_faction',
      playerHistoryDedupeKey: `battle:${input.id}`,
      ...(input.shareable
        ? {
          playerHistorySharePolicy: 'explicit_spectator',
          playerHistoryShareStateLabel: '可分享',
          playerHistoryShareRetentionLabel: '分享后限时可查看',
        }
        : {}),
    },
  }
}

const shareableEvent = buildEvent({ id: SHAREABLE_EVENT_ID, shareable: true })
const unshareableEvent = buildEvent({ id: UNSHAREABLE_EVENT_ID, shareable: false })
const validShareToken = buildShareToken(SHAREABLE_EVENT_ID, Date.now() + 5_000)
const unshareableToken = buildShareToken(UNSHAREABLE_EVENT_ID, Date.now() + 5_000)

const anonymous = filterPlayerHistoryEventsForViewer([shareableEvent, unshareableEvent], {})
assert.deepEqual(anonymous.events.map((event) => event.id), [], 'own-faction events should stay hidden without owner or share grant')

const owner = filterPlayerHistoryEventsForViewer([shareableEvent, unshareableEvent], { factionId: 'player' })
assert.deepEqual(owner.events.map((event) => event.id), [SHAREABLE_EVENT_ID, UNSHAREABLE_EVENT_ID], 'owner faction should still see both own-faction events')

const shared = filterPlayerHistoryEventsForViewer([shareableEvent, unshareableEvent], { explicitSpectatorShareToken: validShareToken })
assert.deepEqual(shared.events.map((event) => event.id), [SHAREABLE_EVENT_ID], 'signed share token should expose only explicitly shareable event')

const unshareableShared = filterPlayerHistoryEventsForViewer([unshareableEvent], { explicitSpectatorShareToken: unshareableToken })
assert.deepEqual(unshareableShared.events.map((event) => event.id), [], 'signed token must not expose events without explicit share policy')

const timeline = buildPlayerWorldTimelineReadModel({
  generatedAt: '2026-06-13T00:00:00.000Z',
  events: [shareableEvent],
  limit: 5,
})
const card = timeline.cards[0]
assert.equal(card.sharePolicy, 'explicit_spectator')
assert.equal(card.shareStateLabel, '可分享')
assert.equal(card.shareRetentionLabel, '分享后限时可查看')
assert.equal(card.sourceRefs?.worldEventId, SHAREABLE_EVENT_ID)

const visiblePayload = JSON.stringify(card)
for (const forbidden of [
  'playerHistorySharePolicy',
  'playerHistoryScope',
  'shareToken',
  'player_history_share_v1',
  'Authorization',
  'Bearer',
  'HMAC',
  'signature',
  'debug',
  'ops',
]) {
  assert.equal(visiblePayload.includes(forbidden), false, `shareable card leaked internal share/auth term: ${forbidden}`)
}

const historyContract = read('shared/contracts/game/history.ts')
for (const typeFact of [
  "sharePolicy?: 'explicit_spectator'",
  'shareStateLabel?: string',
  'shareRetentionLabel?: string',
]) {
  assert.ok(historyContract.includes(typeFact), `timeline card contract should include ${typeFact}`)
}

const historyDomain = read('shared/domain/playerHistory.ts')
for (const domainFact of [
  "readMetadataString(event, 'playerHistorySharePolicy')",
  "sharePolicy: resolveWorldEventSharePolicy(event)",
  "shareStateLabel: readMetadataString(event, 'playerHistoryShareStateLabel')",
  "shareRetentionLabel: readMetadataString(event, 'playerHistoryShareRetentionLabel')",
]) {
  assert.ok(historyDomain.includes(domainFact), `history domain should map ${domainFact}`)
}

const worldService = read('server/src/application/world/WorldService.ts')
for (const producerFact of [
  "playerHistorySharePolicy: 'explicit_spectator'",
  "playerHistoryShareStateLabel: '可分享'",
  "playerHistoryShareRetentionLabel: '分享后限时可查看'",
]) {
  assert.ok(worldService.includes(producerFact), `real battle producer should include ${producerFact}`)
}

const playerHistoryPanel = read('godot-client/scripts/ui/player_history_panel.gd')
const shareResolverStart = playerHistoryPanel.indexOf('func _resolve_timeline_share_event_id(card: Dictionary) -> String:')
assert.ok(shareResolverStart >= 0, 'Godot panel should expose share resolver')
const shareResolverEnd = playerHistoryPanel.indexOf('\nfunc ', shareResolverStart + 1)
const shareResolver = playerHistoryPanel.slice(shareResolverStart, shareResolverEnd)
for (const resolverFact of [
  'var share_policy := str(card.get("sharePolicy", "")).strip_edges()',
  'if share_policy != "explicit_spectator":',
  'return str(source_refs.get("worldEventId", "")).strip_edges()',
]) {
  assert.ok(shareResolver.includes(resolverFact), `Godot share resolver should include ${resolverFact}`)
}
assert.equal(shareResolver.includes('return card_id'), false, 'Godot share resolver must not send timeline card id to the backend share route')

const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const handoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
assert.ok(
  packageJson.includes('"test:world:player-history-shareable-event-annotation-contract"'),
  'package.json must expose shareable event annotation contract',
)
assert.ok(
  authority.includes('Stage 567 player-history shareable event annotation status') &&
    authority.includes('`npm.cmd run test:world:player-history-shareable-event-annotation-contract`') &&
    handoff.includes('Stage 567 - player-history shareable event annotation'),
  'authority and CURRENT handoff must record Stage 567 shareable event annotation gate',
)

console.log('[player_history_shareable_event_annotation_contract] all checks passed')
