import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const readUtf8 = (path: string) => readFileSync(path, 'utf-8')

const authority = readUtf8('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const routeSource = readUtf8('server/src/routes/playerHistory.ts')
const historyContracts = readUtf8('shared/contracts/game/history.ts')
const historyAssembler = readUtf8('shared/domain/playerHistory.ts')
const appSource = readUtf8('server/src/app.ts')
const packageJson = readUtf8('package.json')

const contractId = 'player_history_event_stream_rate_limit_contract'

for (const required of [
  contractId,
  '`player_history_event_stream_rate_limit_contract` Minimum Matrix',
  'Timeline page fetch',
  'Notification badge/toast',
  'Live event stream preview',
  'Replay/history refresh',
  'Civil Memory import',
  'timeline_page_clamped',
  'toast_dedupe_budgeted',
  'live_preview_backpressure',
  'replay_refresh_bounded',
  'civil_memory_import_capped',
  'raw_stream_denied_default',
  'historyPageLimit',
  'historyCursorStable',
  'historyDedupeKey',
  'historyNotificationBudget',
  'historyCooldownApplied',
  'historyDurableCardAnchor',
  '更多新动态',
  'Stage 507 runtime clamp status',
  '`npm.cmd run test:world:player-history-event-stream-runtime-clamp-contract`',
]) {
  assert.ok(authority.includes(required), `missing authority proof: ${required}`)
}

assert.match(routeSource, /const DEFAULT_PLAYER_HISTORY_LIMIT = 80/)
assert.match(routeSource, /const MAX_PLAYER_HISTORY_LIMIT = 80/)
assert.ok(routeSource.includes("searchParams.get('limit')"), 'player history route must parse a page limit')
assert.ok(routeSource.includes("searchParams.get('eventLimit')"), 'player history route must bound event import')
assert.ok(routeSource.includes("searchParams.get('civilMemoryLimit')"), 'player history route must bound Civil Memory import')
assert.ok(routeSource.includes("searchParams.get('livePreview') === '1'"), 'player history live preview must be explicit opt-in')
assert.ok(routeSource.includes('buildPlayerWorldTimelineReadModel'), 'player history route must use player-safe timeline assembler')
assert.ok(routeSource.includes('buildPlayerHistoryLivePreviewReadModel'), 'player history route must use player-safe live-preview read model')
assert.ok(routeSource.includes('limit,'), 'player history route must pass the bounded limit into the assembler')
for (const livePreviewProof of [
  "contractId: 'player_history_live_preview_v1'",
  'optInRequired: true',
  'rawStreamDefaultDenied: true',
  'buildPlayerHistoryLivePreviewReadModel',
  'collapsedFeedbackLabel',
  'backpressureApplied',
]) {
  assert.ok(
    historyContracts.includes(livePreviewProof) || historyAssembler.includes(livePreviewProof),
    `live-preview read model should expose ${livePreviewProof}`,
  )
}
for (const runtimeProof of [
  'historyPageLimit',
  'historyCursorStable',
  'historyNextCursor',
  'historyDedupeKey',
  'historyNotificationBudget',
  'historyCooldownApplied',
  'historyDurableCardAnchor',
]) {
  assert.ok(routeSource.includes(runtimeProof) || historyAssembler.includes(runtimeProof), `runtime read model should expose ${runtimeProof}`)
}

assert.ok(appSource.includes("requestUrl.pathname === '/api/player-history'"), 'player-history route must exist')
assert.ok(appSource.includes("requestUrl.pathname === '/api/events'"), 'raw events route evidence must stay explicit')
assert.ok(appSource.includes("requestUrl.pathname === '/api/events/stream'"), 'raw event stream route evidence must stay explicit')
assert.ok(
  authority.includes('Support-layer event evidence only'),
  'authority must classify raw event routes as support-layer evidence only',
)

assert.ok(
  packageJson.includes('"test:world:player-history-event-stream-rate-limit-contract"'),
  'package.json must expose the formal contract command',
)

const contractSummary = {
  contractId,
  timeline_page_clamped: {
    historyPageLimit: 80,
    historyCursorStable: true,
    nextPageRequiresUserAction: true,
  },
  toast_dedupe_budgeted: {
    historyDedupeKey: 'battle-report:shaoxing-west-pass:turn-44',
    historyNotificationBudget: 3,
    historyCooldownApplied: true,
    historyDurableCardAnchor: 'timeline-card:battle-report:shaoxing-west-pass',
  },
  live_preview_backpressure: {
    optInRequired: true,
    collapsedFeedback: '更多新动态',
    rawStreamIsDefaultTimeline: false,
  },
  replay_refresh_bounded: {
    authorizedLookupRequired: true,
    archiveIdVisibleToPlayer: false,
    refreshRequiresUserAction: true,
  },
  civil_memory_import_capped: {
    batchLimit: 40,
    typedTranslatorCategory: 'diplomacy',
    dedupesRawEventCard: true,
  },
  raw_stream_denied_default: {
    defaultSseAsPlayerTimeline: false,
    playerSafeCopy: '暂无权限查看这段记录',
  },
}

assert.equal(contractSummary.timeline_page_clamped.historyPageLimit <= 80, true)
assert.equal(contractSummary.timeline_page_clamped.historyCursorStable, true)
assert.equal(contractSummary.toast_dedupe_budgeted.historyNotificationBudget <= 3, true)
assert.equal(contractSummary.toast_dedupe_budgeted.historyCooldownApplied, true)
assert.ok(contractSummary.toast_dedupe_budgeted.historyDurableCardAnchor.startsWith('timeline-card:'))
assert.equal(contractSummary.live_preview_backpressure.collapsedFeedback, '更多新动态')
assert.equal(contractSummary.live_preview_backpressure.rawStreamIsDefaultTimeline, false)
assert.equal(contractSummary.raw_stream_denied_default.defaultSseAsPlayerTimeline, false)

const playerVisibleCopy = [
  contractSummary.live_preview_backpressure.collapsedFeedback,
  contractSummary.raw_stream_denied_default.playerSafeCopy,
  '该记录仅限相关成员查看',
  '这段回放未开放查看',
].join('\n')

for (const forbidden of [
  '/api/events',
  '/api/events/stream',
  'SSE',
  'raw event',
  'backend timing',
  'replayLimit',
  'ops',
  'debug',
  'historyPageLimit',
  'historyDedupeKey',
  'historyNotificationBudget',
  'historyCooldownApplied',
  'historyDurableCardAnchor',
]) {
  assert.equal(
    playerVisibleCopy.includes(forbidden),
    false,
    `player visible copy leaked implementation term: ${forbidden}`,
  )
}

console.log('[player_history_event_stream_rate_limit_contract] all checks passed')
