import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const readUtf8 = (path: string) => readFileSync(path, 'utf-8')

const authority = readUtf8('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const routeSource = readUtf8('server/src/routes/playerHistory.ts')
const historyContracts = readUtf8('shared/contracts/game/history.ts')
const packageJson = readUtf8('package.json')

const contractId = 'player_history_access_scope_contract'

for (const required of [
  contractId,
  '`player_history_access_scope_contract` Minimum Matrix',
  'Human player faction',
  'Alliance / nation officer',
  'Explicit spectator / replay share',
  'Support / ops tooling',
  'allowed own-faction fixture',
  'allowed organization-scope fixture',
  'explicit spectator fixture',
  'denied cross-faction private AI proposal fixture',
  '暂无权限查看这段记录',
  '该记录仅限相关成员查看',
  '这段回放未开放查看',
  'Save/load cards are scoped to the current player/session',
  'it must not be treated as completed session/faction/organization/spectator enforcement',
  'Runtime bearer-token validation',
  'Stage 508 runtime access status',
  '`npm.cmd run test:world:player-history-runtime-access-scope-contract`',
]) {
  assert.ok(authority.includes(required), `missing access-scope authority proof: ${required}`)
}

assert.ok(
  packageJson.includes('"test:world:player-history-access-scope-contract"'),
  'package.json must expose the formal access-scope command',
)

assert.ok(
  routeSource.includes('buildPlayerWorldTimelineReadModel') &&
    routeSource.includes('buildPlayerSaveLoadReadModel') &&
    routeSource.includes('buildCivilMemoryHistoryCards'),
  'current /api/player-history route must remain a player-safe read-model assembler route',
)
assert.ok(
  routeSource.includes('getWorldEvents') &&
    routeSource.includes('getSaveSlots') &&
    routeSource.includes('getCivilMemorySnapshot'),
  'current /api/player-history route must expose its unscoped support-source inputs as incomplete access evidence',
)
assert.ok(
  routeSource.includes('getSessionControlContextByToken') &&
    routeSource.includes('readBearerToken') &&
    routeSource.includes('deniedCopy') &&
    routeSource.includes('requestedFactionId !== sessionContext.factionId'),
  'current /api/player-history route should enforce the first runtime session/faction boundary',
)

for (const contractToken of [
  'PlayerWorldTimelineCard',
  'PlayerWorldTimelineReadModel',
  'PlayerSaveLoadReadModel',
  'CivilMemoryHistoryCard',
  'PlayerHistoryContracts',
  'sourceRefs',
]) {
  assert.ok(historyContracts.includes(contractToken), `history contract should include ${contractToken}`)
}

const accessFixtures = [
  {
    fixtureId: 'allowed_own_faction',
    viewerScope: 'human_player_faction',
    mayRead: ['own faction battle reports', 'own save slots', 'own governed AI receipts'],
    mustDeny: ['other faction private AI proposal', 'provider diagnostics', 'hidden diplomacy draft'],
    visibleCopy: '查看本势力记录',
    allowed: true,
  },
  {
    fixtureId: 'allowed_organization_scope',
    viewerScope: 'alliance_or_nation_officer',
    mayRead: ['organization-visible diplomacy', 'rally', 'Court/world-effect cards within role scope'],
    mustDeny: ['personal save slots', 'private AI chat/voice payload', 'unrelated faction hidden cards'],
    visibleCopy: '查看同盟记录',
    allowed: true,
  },
  {
    fixtureId: 'explicit_spectator',
    viewerScope: 'explicit_spectator_replay_share',
    mayRead: ['explicitly shared replay/report cards', 'public world-history events'],
    mustDeny: ['save/load state', 'private AI proposal', 'hidden Court/diplomacy metadata'],
    visibleCopy: '查看共享回放',
    allowed: true,
  },
  {
    fixtureId: 'denied_cross_faction_private_ai_proposal',
    viewerScope: 'foreign_faction_player',
    mayRead: [],
    mustDeny: ['private AI proposal', 'provider/accounting diagnostics', 'hidden diplomacy draft'],
    visibleCopy: '暂无权限查看这段记录',
    allowed: false,
  },
]

for (const fixture of accessFixtures) {
  assert.ok(fixture.fixtureId.length > 0)
  assert.ok(fixture.viewerScope.length > 0)
  assert.ok(fixture.mustDeny.length > 0 || fixture.allowed)
  assert.ok(fixture.visibleCopy.length > 0)
}

const fixtureIds = accessFixtures.map((fixture) => fixture.fixtureId)
assert.deepEqual(fixtureIds, [
  'allowed_own_faction',
  'allowed_organization_scope',
  'explicit_spectator',
  'denied_cross_faction_private_ai_proposal',
])
assert.equal(accessFixtures.filter((fixture) => fixture.allowed).length, 3)
assert.equal(accessFixtures.filter((fixture) => !fixture.allowed).length, 1)

const deniedVisibleCopy = [
  '暂无权限查看这段记录',
  '该记录仅限相关成员查看',
  '这段回放未开放查看',
].join('\n')

for (const forbidden of [
  'token',
  'route',
  'provider',
  'archive',
  'debug',
  'ops',
  'Authorization',
  '/api/',
  'private AI proposal',
  'hidden diplomacy draft',
  'Court metadata',
]) {
  assert.equal(
    deniedVisibleCopy.includes(forbidden),
    false,
    `denied player-visible copy leaked access implementation detail: ${forbidden}`,
  )
}

console.log('[player_history_access_scope_contract] all checks passed')
