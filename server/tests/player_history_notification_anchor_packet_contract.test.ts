import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const readUtf8 = (path: string) => readFileSync(path, 'utf-8')

const authority = readUtf8('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const eventStreamContract = readUtf8('server/tests/player_history_event_stream_rate_limit_contract.test.ts')
const historyContracts = readUtf8('shared/contracts/game/history.ts')
const historyDomain = readUtf8('shared/domain/playerHistory.ts')
const playerHistoryPanel = readUtf8('godot-client/scripts/ui/player_history_panel.gd')
const packageJson = readUtf8('package.json')

const contractId = 'player_history_notification_anchor_packet_contract'

for (const required of [
  contractId,
  'history_notification_anchor_packet',
  'notification_anchor',
  'history_notification_surface',
  'Notification badge/toast',
  'Per-surface notification budget',
  'dedupe key',
  'cooldown window',
  'user-dismiss state',
  'durable history card anchor',
  'historyDurableCardAnchor',
  'dismissedNotificationDedupeKey',
  'historyNotificationSuppressionApplied',
  'runtime notification budget/dedupe',
  'durable-card click-through',
  'durable card anchor',
  'denied/private feedback',
  'screenshot proof',
]) {
  assert.ok(authority.includes(required), `missing notification anchor authority proof: ${required}`)
}

assert.ok(
  packageJson.includes('"test:world:player-history-notification-anchor-packet-contract"'),
  'package.json must expose the notification anchor packet contract command',
)

for (const eventProof of [
  'toast_dedupe_budgeted',
  'historyNotificationBudget',
  'historyCooldownApplied',
  'historyDurableCardAnchor',
  '更多新动态',
]) {
  assert.ok(eventStreamContract.includes(eventProof), `event-stream contract should already prove ${eventProof}`)
}

assert.ok(historyContracts.includes('sourceRefs?: {'), 'timeline card contract must expose hidden source refs')
for (const sourceRef of [
  'battleReportId?: string',
  'replayRequestId?: string',
  'saveSlotId?: string',
  'worldEventId?: string',
  'civilMemoryId?: string',
]) {
  assert.ok(historyContracts.includes(sourceRef), `timeline source refs should include ${sourceRef}`)
}

assert.ok(historyDomain.includes('sourceRefs: {'), 'timeline assembler must preserve source refs for anchors')
assert.ok(historyDomain.includes('worldEventId: event.id'), 'world events should be anchorable by source ref')
assert.ok(historyDomain.includes('replayRequestId: replay.requestId'), 'replays should be anchorable by source ref')

for (const panelProof of [
  'PLAYER_HISTORY_MOTION_TOKEN := "player_history_timeline_card_entry_motion_v1"',
  'func _rebuild_timeline(timeline: Dictionary) -> void:',
  'TimelineCard%02d',
  'nextActionLabel',
  '_apply_card_motion(panel, index)',
  '"timelineCardCount": _timeline_card_count',
]) {
  assert.ok(playerHistoryPanel.includes(panelProof), `PlayerHistoryPanel should expose timeline anchor render proof: ${panelProof}`)
}

const notificationAnchorPacket = {
  contractId,
  notification_budgeted: {
    historyNotificationBudget: 3,
    historyCooldownApplied: true,
    userDismissStateRequired: true,
  },
  duplicate_suppressed: {
    historyDedupeKey: 'battle:shaoxing-west-pass:turn-44',
    dismissedNotificationDedupeKey: 'battle:shaoxing-west-pass:turn-44',
    historyNotificationSuppressionApplied: true,
    repeatedToastSuppressed: true,
  },
  durable_card_anchor: {
    historyDurableCardAnchor: 'timeline-card:world-event:shaoxing-west-pass',
    sourceRefKind: 'worldEventId',
    clickThroughRequired: true,
  },
  denied_private_feedback: {
    playerSafeCopy: '该记录仅限相关成员查看',
    hiddenExistenceNotRevealed: true,
  },
  collapsed_live_updates: {
    playerSafeCopy: '更多新动态',
    rawStreamRowsVisible: false,
  },
}

assert.equal(notificationAnchorPacket.notification_budgeted.historyNotificationBudget <= 3, true)
assert.equal(notificationAnchorPacket.notification_budgeted.historyCooldownApplied, true)
assert.equal(notificationAnchorPacket.notification_budgeted.userDismissStateRequired, true)
assert.equal(notificationAnchorPacket.duplicate_suppressed.repeatedToastSuppressed, true)
assert.equal(notificationAnchorPacket.duplicate_suppressed.historyNotificationSuppressionApplied, true)
assert.ok(notificationAnchorPacket.durable_card_anchor.historyDurableCardAnchor.startsWith('timeline-card:'))
assert.equal(notificationAnchorPacket.durable_card_anchor.clickThroughRequired, true)
assert.equal(notificationAnchorPacket.denied_private_feedback.hiddenExistenceNotRevealed, true)
assert.equal(notificationAnchorPacket.collapsed_live_updates.rawStreamRowsVisible, false)

const playerVisibleCopy = [
  notificationAnchorPacket.denied_private_feedback.playerSafeCopy,
  notificationAnchorPacket.collapsed_live_updates.playerSafeCopy,
  '新的战况已入册',
  '前往大事查看',
].join('\n')

for (const forbidden of [
  '/api/events',
  '/api/events/stream',
  'SSE',
  'raw event',
  'backend timing',
  'historyDedupeKey',
  'historyNotificationBudget',
  'historyCooldownApplied',
  'historyDurableCardAnchor',
  'sourceRefs',
  'toast_dedupe_budgeted',
  'ops',
  'debug',
  'route',
  'contract',
]) {
  assert.equal(
    playerVisibleCopy.includes(forbidden),
    false,
    `notification player-visible copy leaked implementation term: ${forbidden}`,
  )
}

console.log('[player_history_notification_anchor_packet_contract] all checks passed')
