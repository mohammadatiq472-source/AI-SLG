import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const readUtf8 = (path: string) => readFileSync(path, 'utf-8')

const authority = readUtf8('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const organizationAuthority = readUtf8('docs/PRODUCT_AUTHORITY_ORGANIZATION_NATION_LADDER_CURRENT_2026_06_11.md')
const diplomacyRoutes = readUtf8('server/src/routes/diplomacy.ts')
const diplomacyRoutesContract = readUtf8('server/tests/diplomacy_routes_contract.test.ts')
const organizationDiplomacyContract = readUtf8('server/tests/organization_diplomacy_authority_contract.test.ts')
const metaContracts = readUtf8('shared/contracts/game/meta.ts')
const playerHistoryDomain = readUtf8('shared/domain/playerHistory.ts')
const packageJson = readUtf8('package.json')

const contractId = 'player_history_diplomacy_producer_packet_contract'

for (const required of [
  contractId,
  'diplomacy_history_producer_packet',
  'Diplomacy History Producer Packet Contract',
  'organization_diplomacy_authority_v1',
  'diplomacySubjectBoundary=organization_not_ai_player',
  'requiredPermission=manage_diplomacy',
  'recordDiplomacyRuntimeEvent(...) -> appendRuntimeWorldEvent(...)',
  "metadata.playerHistoryCategory='diplomacy'",
  'proposed',
  'responded',
  'relation_changed',
  'expired_or_rejected',
  'organization_scope',
  'dedupe',
  'recovery',
  'AI-player chat or raw proposal routes',
  '`npm.cmd run test:world:player-history-diplomacy-producer-contract` now proves the first route-level diplomacy overlay producer.',
]) {
  assert.ok(authority.includes(required), `missing diplomacy producer authority proof: ${required}`)
}

assert.ok(
  packageJson.includes('"test:world:player-history-diplomacy-producer-packet-contract"'),
  'package.json must expose the diplomacy producer packet contract command',
)

for (const organizationToken of [
  'Organization diplomacy authority exists',
  'organization_diplomacy_authority_v1',
  'diplomacySubjectBoundary=organization_not_ai_player',
  'requiredPermission=manage_diplomacy',
  'Cross-faction contact',
  'route rejects same-faction proposer / target pairs',
]) {
  assert.ok(organizationAuthority.includes(organizationToken), `organization/nation authority should include ${organizationToken}`)
}

for (const contractToken of [
  "contractId: 'organization_diplomacy_authority_v1'",
  "subjectKind: 'alliance' | 'nation'",
  "diplomacySubjectBoundary: 'organization_not_ai_player'",
  "proposalRoute: '/api/diplomacy/propose'",
  "requiredPermission: 'manage_diplomacy'",
  'actors: OrganizationDiplomacyAuthorityActor[]',
  'relations: OrganizationDiplomacyRelation[]',
]) {
  assert.ok(metaContracts.includes(contractToken), `shared meta contract should expose ${contractToken}`)
}

for (const routeToken of [
  'POST /api/diplomacy/propose',
  'POST /api/diplomacy/respond',
  'GET  /api/diplomacy/proposals',
  'GET  /api/diplomacy/proposals/:id',
  'function recordDiplomacyRuntimeEvent',
  'appendRuntimeWorldEvent({',
  "action: 'diplomacy_propose'",
  "action: 'diplomacy_respond'",
  'proposalId: result.proposal.id',
  'proposerId',
  'targetId',
  'proposerControlMode',
  'targetControlMode',
  'Cannot negotiate with generals of the same faction.',
]) {
  assert.ok(diplomacyRoutes.includes(routeToken), `diplomacy route should expose support fact: ${routeToken}`)
}

assert.equal(
  diplomacyRoutes.includes('playerHistoryCategory'),
  true,
  'diplomacy route should now emit the first player-history diplomacy overlay producer',
)

for (const implementedRouteToken of [
  'function buildDiplomacyHistoryOverlay',
  "playerHistoryCategory: 'diplomacy'",
  "playerHistoryTitle: '同盟交涉已发起'",
  "playerHistoryTitle: '外交回应已送达'",
  "playerHistoryScope: 'organization_scope'",
  'playerHistoryDedupeKey',
]) {
  assert.ok(diplomacyRoutes.includes(implementedRouteToken), `diplomacy route should expose implemented overlay proof: ${implementedRouteToken}`)
}

for (const supportGateToken of [
  "assert.equal(sameFaction.status, 400",
  'diplomacy must be cross-faction at this route layer',
  "proposalId.startsWith('diplo_')",
  "assert.equal(respond.status, 200",
  "['accept', 'reject', 'counter']",
]) {
  assert.ok(diplomacyRoutesContract.includes(supportGateToken), `diplomacy route contract should prove ${supportGateToken}`)
}

for (const authorityGateToken of [
  "assert.equal(model.contractId, 'organization_diplomacy_authority_v1')",
  "assert.equal(model.diplomacySubjectBoundary, 'organization_not_ai_player')",
  "assert.equal(model.proposalRoute, '/api/diplomacy/propose')",
  "assert.equal(model.requiredPermission, 'manage_diplomacy')",
  "actor.actorKind === 'organization_subject'",
  'read model should expose the alliance/nation as the diplomacy subject',
]) {
  assert.ok(organizationDiplomacyContract.includes(authorityGateToken), `organization diplomacy gate should prove ${authorityGateToken}`)
}

for (const playerHistoryToken of [
  "|| value === 'diplomacy'",
  'playerHistoryCategory',
  'playerHistoryTitle',
  'playerHistoryActorName',
  'playerHistoryTarget',
  'playerHistoryResultLabel',
  'playerHistoryConsequence',
  'playerHistoryNextAction',
]) {
  assert.ok(playerHistoryDomain.includes(playerHistoryToken), `player history overlay grammar should expose ${playerHistoryToken}`)
}

const diplomacyProducerStates = [
  'proposed',
  'responded',
  'relation_changed',
  'expired_or_rejected',
  'organization_scope',
  'dedupe',
  'recovery',
]
assert.equal(diplomacyProducerStates.length, 7)

const diplomacyProducerFixture = {
  contractId,
  category: 'diplomacy',
  playerHistoryTitle: '同盟交涉已发起',
  playerHistoryActorName: '青徐同盟',
  playerHistorySummary: '青徐同盟向兖州同盟提出三日停战。',
  playerHistoryTarget: '兖州同盟',
  playerHistoryResultLabel: '待回应',
  playerHistoryConsequence: '边境战事可能暂缓，仍需等待对方答复。',
  playerHistoryNextAction: '查看外交',
  playerHistorySeverity: 'medium',
  subjectBoundary: 'organization_not_ai_player',
  sourceRefs: {
    diplomacyProposalId: 'summary-only-diplo-id',
  },
  dedupeKey: 'diplomacy:qingxu:yanzhou:ceasefire:pending',
}

assert.equal(diplomacyProducerFixture.category, 'diplomacy')
assert.equal(diplomacyProducerFixture.subjectBoundary, 'organization_not_ai_player')
assert.ok(diplomacyProducerFixture.dedupeKey.startsWith('diplomacy:'))
assert.ok(diplomacyProducerFixture.sourceRefs.diplomacyProposalId.length > 0)

const playerVisibleCopy = [
  diplomacyProducerFixture.playerHistoryTitle,
  diplomacyProducerFixture.playerHistoryActorName,
  diplomacyProducerFixture.playerHistorySummary,
  diplomacyProducerFixture.playerHistoryTarget,
  diplomacyProducerFixture.playerHistoryResultLabel,
  diplomacyProducerFixture.playerHistoryConsequence,
  diplomacyProducerFixture.playerHistoryNextAction,
  '对方拒绝停战，请重新评估边境部署。',
].join('\n')

for (const forbidden of [
  'diplomacy_propose',
  'diplomacy_respond',
  '/api/diplomacy/propose',
  '/api/diplomacy/respond',
  'proposalId',
  'proposerId',
  'targetId',
  'diplo_',
  'controlMode',
  'autonomyLevel',
  'AI-player',
  'AI player',
  'same faction',
  'organization_not_ai_player',
  'sourceRefs',
  'debug',
  'route',
  'fixture',
  'gate',
  'snake_case',
]) {
  assert.equal(
    playerVisibleCopy.includes(forbidden),
    false,
    `diplomacy producer visible copy leaked implementation term: ${forbidden}`,
  )
}

console.log('[player_history_diplomacy_producer_packet_contract] all checks passed')
