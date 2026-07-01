import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

const route = read('server/src/routes/playerHistory.ts')
const httpContract = read('server/tests/player_history_civil_memory_detail_http_contract.test.ts')
const shareTokenContract = read('server/tests/player_history_civil_memory_detail_share_token_runtime_contract.test.ts')
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const handoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')

for (const routeFact of [
  'handlePlayerHistoryCivilMemoryDetailRoute',
  'readCivilMemoryShareAccess(civilMemoryId, shareToken, res)',
  "sharedScope: 'public_context'",
  'buildCivilMemoryShareToken(civilMemoryId, expiresAtMs)',
  'verifyCivilMemoryShareToken(civilMemoryId, shareToken)',
  'signCivilMemoryShareToken(civilMemoryId, expiresAtMs)',
]) {
  assert.ok(route.includes(routeFact), `Civil Memory route should preserve boundary fact: ${routeFact}`)
}

for (const publicDetailFact of [
  '/api/player-history/civil-memory-detail?civilMemoryId=civil-detail-http-1',
  'detail.contractId,',
  'visibleDetailPayload',
  'internalPlannerTrace',
]) {
  assert.ok(httpContract.includes(publicDetailFact), `Civil Memory public detail contract should prove ${publicDetailFact}`)
}

for (const shareFact of [
  'missingSessionIssue.status, 401',
  'crossFactionIssue.status, 403',
  "issuePayload.sharedScope, 'public_context'",
  'civil_memory_share_v1',
  "issuedShareToken.includes('civil-detail-share-1'), false",
  'legacyGuessDenied.status, 401',
  'expiredShare.status, 401',
  'visibleDeniedCopy',
]) {
  assert.ok(shareTokenContract.includes(shareFact), `Civil Memory share-token contract should prove ${shareFact}`)
}

assert.ok(
  packageJson.includes('"test:world:player-history-civil-memory-detail-access-shareability-boundary-contract"'),
  'package.json must expose Civil Memory access/shareability boundary contract',
)
assert.ok(
  authority.includes('Stage 574 Civil Memory detail access/shareability boundary') &&
    handoff.includes('Stage 574 - Civil Memory detail access/shareability boundary'),
  'authority and CURRENT handoff must record Stage 574 Civil Memory boundary',
)

console.log('[player_history_civil_memory_detail_access_shareability_boundary_contract] all checks passed')
