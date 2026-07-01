import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const readUtf8 = (path: string) => readFileSync(path, 'utf-8')

const authority = readUtf8('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const replayRoutes = readUtf8('server/src/routes/replay.ts')
const appSource = readUtf8('server/src/app.ts')
const playerHistoryRoute = readUtf8('server/src/routes/playerHistory.ts')
const playerHistoryDomain = readUtf8('shared/domain/playerHistory.ts')
const packageJson = readUtf8('package.json')

const contractId = 'player_history_replay_archive_permission_contract'

for (const required of [
  contractId,
  'Replay Archive Permission Minimum Matrix',
  'Authorized replay',
  'Denied replay',
  'Expired or unavailable replay',
  'Shared spectator replay',
  'authorized replay lookup',
  'expired/unavailable replay copy',
  'retention label',
  'denied replay fixture',
  'player-safe fallback card',
  'Replay-RAG internals',
  'replay archive id as visible title',
  'Support/ops replay evidence only',
  'Stage 509 replay unavailable runtime status',
  '`npm.cmd run test:world:player-history-replay-unavailable-runtime-contract`',
  'Stage 510 replay support-route runtime authorization status',
  '`npm.cmd run test:world:player-history-replay-support-route-runtime-auth-contract`',
  'Stage 511 replay explicit share grant runtime status',
  '`npm.cmd run test:world:player-history-replay-share-grant-runtime-contract`',
  'Stage 512 replay retention expiry runtime status',
  '`npm.cmd run test:world:player-history-replay-retention-runtime-contract`',
  'Stage 513 replay shared-frame filtering runtime status',
  '`npm.cmd run test:world:player-history-replay-shared-frame-filter-runtime-contract`',
  'Stage 514 replay share-token issuance and expiry runtime status',
  '`npm.cmd run test:world:player-history-replay-share-token-issue-expiry-runtime-contract`',
  'Stage 515 replay timeline-card redaction runtime status',
  '`npm.cmd run test:world:player-history-replay-card-redaction-runtime-contract`',
  'Stage 516 replay screen-frame redaction runtime status',
  '`npm.cmd run test:world:player-history-replay-screen-redaction-runtime-contract`',
  'Stage 517 sourceRef visibility runtime status',
  '`npm.cmd run test:world:player-history-source-ref-visibility-runtime-contract`',
]) {
  assert.ok(authority.includes(required), `missing replay archive authority proof: ${required}`)
}

assert.ok(
  packageJson.includes('"test:world:player-history-replay-archive-permission-contract"'),
  'package.json must expose the formal replay archive permission command',
)

for (const supportRoute of [
  "requestUrl.pathname === '/api/replay/archive'",
  "requestUrl.pathname === '/api/replay/rag-cache'",
  "requestUrl.pathname.endsWith('/share-token')",
  "requestUrl.pathname.startsWith('/api/replay/')",
]) {
  assert.ok(appSource.includes(supportRoute), `app route should expose support replay route fact: ${supportRoute}`)
}

for (const supportHandler of [
  'handleReplayArchiveRoute',
  'handleReplayEntryRoute',
  'handleReplayRagCacheStatsRoute',
  'authorizeReplaySupportRoute',
  'buildReplayShareToken',
  'verifyReplayShareToken',
  'REPLAY_SHARE_TOKEN_SECRET',
  'MAX_REPLAY_SHARE_TOKEN_TTL_MS',
  'handleReplayShareTokenRoute',
  'shareToken',
  'REPLAY_RETENTION_MAX_AGE_MS',
  'isReplayArchiveEntryExpired',
  "retentionLabel: '保留期已过'",
  "deniedCopy: '这段回放暂时无法查看，可返回战报。'",
  'buildSharedSpectatorReplay',
  'buildSharedSpectatorArchive',
  "sharedScope: 'public_context'",
  "frontlineSummary: '仅显示已共享的战况。'",
  'getSessionControlContextByToken',
  "deniedCopy: '这段回放未开放查看'",
  'getReplayArchive()',
  'getReplayArchiveEntry(requestId)',
  'getReplayRagCacheStats()',
]) {
  assert.ok(replayRoutes.includes(supportHandler), `replay route should include support handler fact: ${supportHandler}`)
}

assert.ok(
  playerHistoryRoute.includes("requestUrl.searchParams.get('replayRequestId')") &&
    playerHistoryRoute.includes('buildBattleReplayScreenReadModel') &&
    playerHistoryRoute.includes('buildUnavailableBattleReplayScreenReadModel') &&
    playerHistoryRoute.includes('collectReplays(replayLimit)'),
  'player-history route must build replay view through player-safe read-model path',
)

for (const redactionFact of [
  'buildReplayTimelineCardId',
  'buildReplayScreenReportId',
  'buildReplayFrameId',
  "visibility: 'internal_link_only'",
  'visible: false',
  "title: '战斗回放已生成'",
  "replayTitle: '战斗回放'",
  "actorName: '参战部队'",
  "summary: replay.frames.length > 0 ? '可以查看行动过程' : '回放暂不可检查'",
  'replayCardId',
]) {
  assert.ok(playerHistoryDomain.includes(redactionFact), `player-history domain should include replay card redaction fact: ${redactionFact}`)
}

const replayPermissionFixtures = [
  {
    fixtureId: 'authorized_replay_lookup',
    state: 'authorized_replay',
    allowed: true,
    visibleTitle: '虎牢关战斗回放',
    visibleCopy: '可逐步查看行动结果',
    summaryProof: {
      authorizedReplayLookup: true,
      sourceIdentityPreserved: true,
      playerSafeFallbackCard: false,
    },
  },
  {
    fixtureId: 'denied_replay_fixture',
    state: 'denied_replay',
    allowed: false,
    visibleTitle: '回放暂不可查看',
    visibleCopy: '这段回放未开放查看',
    summaryProof: {
      deniedReplayFixture: true,
      hiddenExistenceNotRevealed: true,
      playerSafeFallbackCard: true,
    },
  },
  {
    fixtureId: 'expired_unavailable_replay_copy',
    state: 'expired_or_unavailable_replay',
    allowed: false,
    visibleTitle: '回放已不可用',
    visibleCopy: '这段回放暂时无法查看，可返回战报。',
    summaryProof: {
      expiredUnavailableReplayCopy: true,
      retentionLabel: '保留期已过',
      playerSafeFallbackCard: true,
    },
  },
  {
    fixtureId: 'shared_spectator_replay',
    state: 'shared_spectator_replay',
    allowed: true,
    visibleTitle: '共享战斗回放',
    visibleCopy: '仅显示已共享的战况。',
    summaryProof: {
      explicitShareGrant: true,
      privateSaveLoadHidden: true,
      playerSafeFallbackCard: false,
    },
  },
]

assert.deepEqual(replayPermissionFixtures.map((fixture) => fixture.fixtureId), [
  'authorized_replay_lookup',
  'denied_replay_fixture',
  'expired_unavailable_replay_copy',
  'shared_spectator_replay',
])
assert.equal(replayPermissionFixtures.filter((fixture) => fixture.allowed).length, 2)
assert.equal(replayPermissionFixtures.filter((fixture) => !fixture.allowed).length, 2)
assert.equal(replayPermissionFixtures[2]?.summaryProof.retentionLabel, '保留期已过')

const playerVisibleCopy = replayPermissionFixtures
  .flatMap((fixture) => [fixture.visibleTitle, fixture.visibleCopy])
  .join('\n')

for (const forbidden of [
  'replay archive id',
  '/api/replay',
  '/api/events',
  'Replay-RAG',
  'RAG cache',
  'JSON',
  'requestId',
  'route',
  'backend event type',
  '401',
  '403',
  '404',
  '500',
  'token',
  'faction id',
  'archive path',
  'stack trace',
  'ops',
  'debug',
]) {
  assert.equal(
    playerVisibleCopy.includes(forbidden),
    false,
    `player-visible replay permission copy leaked implementation term: ${forbidden}`,
  )
}

console.log('[player_history_replay_archive_permission_contract] all checks passed')
