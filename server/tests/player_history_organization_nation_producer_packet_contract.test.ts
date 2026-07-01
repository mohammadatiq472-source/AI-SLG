import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const readUtf8 = (path: string) => readFileSync(path, 'utf-8')

const authority = readUtf8('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const organizationAuthority = readUtf8('docs/PRODUCT_AUTHORITY_ORGANIZATION_NATION_LADDER_CURRENT_2026_06_11.md')
const metaContracts = readUtf8('shared/contracts/game/meta.ts')
const worldContracts = readUtf8('shared/contracts/game/world.ts')
const playerHistoryDomain = readUtf8('shared/domain/playerHistory.ts')
const worldService = readUtf8('server/src/application/world/WorldService.ts')
const assemblerContract = readUtf8('server/tests/player_history_read_model_assembler_contract.test.ts')
const membershipContract = readUtf8('server/tests/alliance_organization_membership_contract.test.ts')
const organizationDiplomacyContract = readUtf8('server/tests/organization_diplomacy_authority_contract.test.ts')
const nationEmpireContract = readUtf8('server/tests/nation_empire_upgrade_contract.test.ts')
const nationWarObjectiveContract = readUtf8('server/tests/nation_war_objective_contract.test.ts')
const currentGoalsContract = readUtf8('server/tests/godot_current_goals_nation_midgame_entry_contract.test.ts')
const playerUiCopyContract = readUtf8('server/tests/godot_nation_midgame_player_ui_copy_contract.test.ts')
const frontendSkeletonContract = readUtf8('server/tests/godot_nation_midgame_frontend_skeleton_contract.test.ts')
const realmObjectiveBridgeContract = readUtf8('server/tests/world_nation_midgame_realm_objective_bridge_contract.test.ts')
const realmObjectiveProducerContract = readUtf8('server/tests/player_history_organization_nation_realm_objective_producer_contract.test.ts')
const packageJson = readUtf8('package.json')

const contractId = 'player_history_organization_nation_producer_packet_contract'

for (const required of [
  contractId,
  'organization_nation_history_producer_packet',
  'Organization / Nation History Producer Packet Contract',
  'membership_changed',
  'organization_objective_updated',
  'nation_founded_or_profile_changed',
  'kingdom_empire_progressed',
  'luoyang_control_chain',
  'organization_diplomacy_body',
  'objective_blocked_or_denied',
  'dedupe',
  'scope_denied',
  'recovery',
  'playerHistoryCategory',
  '`npm.cmd run test:world:player-history-organization-nation-realm-objective-producer-contract` now proves the first real realm-objective organization/nation overlay producer.',
]) {
  assert.ok(authority.includes(required), `missing organization/nation producer authority proof: ${required}`)
}

assert.ok(
  packageJson.includes('"test:world:player-history-organization-nation-producer-packet-contract"'),
  'package.json must expose the organization/nation producer packet contract command',
)
assert.ok(
  packageJson.includes('"test:world:player-history-organization-nation-realm-objective-producer-contract"'),
  'package.json must expose the realm-objective organization/nation producer contract command',
)

for (const organizationToken of [
  'Organization is the midgame scale path.',
  'The ladder is not a backend table.',
  'Alliance',
  'Nation',
  'Kingdom',
  'Empire',
  'Unification',
  'organization_diplomacy_authority_v1',
  'diplomacySubjectBoundary=organization_not_ai_player',
  'old fixed numbers such as 150 levels or 5700 seats',
]) {
  assert.ok(organizationAuthority.includes(organizationToken), `organization/nation authority should include ${organizationToken}`)
}

for (const metaToken of [
  "contractId: 'organization_membership_authority_v1'",
  "organizationKind: 'alliance' | 'nation'",
  'members: OrganizationMembershipReadModelItem[]',
  "contractId: 'organization_diplomacy_authority_v1'",
  "diplomacySubjectBoundary: 'organization_not_ai_player'",
  "requiredPermission: 'manage_diplomacy'",
  "objectiveId: NationWarObjectiveId",
  "| 'east_han_unification'",
]) {
  assert.ok(metaContracts.includes(metaToken), `shared meta contract should expose ${metaToken}`)
}

for (const worldToken of [
  "export type CurrentGoalLayerId = 'firstHour' | 'growth' | 'alliance' | 'kingdom' | 'empire' | 'unification'",
  "organizationKind?: 'alliance' | 'nation'",
  'nationName?: string',
  'nationTier?: NationTier',
  'kingdomObjectivePrerequisiteVisible?: boolean',
  'empireObjectivePrerequisiteVisible?: boolean',
  "nationMidgameRealmObjectiveBridgeScope?: 'realm_objective_bridge_only_not_full_kingdom_empire_creation'",
]) {
  assert.ok(worldContracts.includes(worldToken), `world contract should expose organization/nation fact: ${worldToken}`)
}

for (const playerHistoryToken of [
  "|| value === 'organization_nation'",
  "return 'organization_nation'",
  'playerHistoryCategory',
  'playerHistoryTitle',
  'playerHistoryActorName',
  'playerHistoryTarget',
  'playerHistoryResultLabel',
  'playerHistoryConsequence',
  'playerHistoryNextAction',
]) {
  assert.ok(playerHistoryDomain.includes(playerHistoryToken), `player history domain should expose ${playerHistoryToken}`)
}

for (const sourceToken of [
  'function buildOrganizationNationRealmObjectiveHistoryOverlay',
  "playerHistoryCategory: 'organization_nation'",
  "playerHistoryTitle: '同盟目标推进'",
  "playerHistoryNextAction: '查看同盟目标'",
  "playerHistoryScope: 'own_organization'",
]) {
  assert.ok(worldService.includes(sourceToken), `WorldService organization/nation producer source should prove ${sourceToken}`)
}

for (const producerToken of [
  'player_history_organization_nation_realm_objective_producer_contract',
  "action, 'recordNationMidgameRealmObjectiveBridge'",
  "metadata.playerHistoryCategory, 'organization_nation'",
  "card.category === 'organization_nation'",
  '查看同盟目标',
]) {
  assert.ok(realmObjectiveProducerContract.includes(producerToken), `realm objective producer contract should prove ${producerToken}`)
}

for (const assemblerToken of [
  "action: 'organization_objective_internal'",
  "playerHistoryCategory: 'organization_nation'",
  "playerHistoryTitle: '同盟目标推进'",
  "card.category === 'organization_nation' && card.title === '同盟目标推进'",
]) {
  assert.ok(assemblerContract.includes(assemblerToken), `assembler contract should prove ${assemblerToken}`)
}

for (const membershipToken of [
  "assert.equal(model.contractId, 'organization_membership_authority_v1')",
  "assert.equal(model.organizationKind, 'nation')",
  "assert.equal(model.organizationName, '齐国')",
  "member.memberKind === 'player'",
  "member.memberKind === 'ai_player'",
  "member.memberKind === 'alliance_officer'",
]) {
  assert.ok(membershipContract.includes(membershipToken), `membership contract should prove ${membershipToken}`)
}

for (const diplomacyToken of [
  "assert.equal(model.contractId, 'organization_diplomacy_authority_v1')",
  "assert.equal(model.diplomacySubjectBoundary, 'organization_not_ai_player')",
  "actor.actorKind === 'organization_subject'",
  'AI players are members/advisers, not diplomacy subjects in this read model',
]) {
  assert.ok(organizationDiplomacyContract.includes(diplomacyToken), `organization diplomacy contract should prove ${diplomacyToken}`)
}

for (const nationToken of [
  '/api/nation/found',
  '/api/nation/empire/upgrade',
  "failureCode, 'nation_empire_forbidden'",
  "failureCode, 'nation_empire_level_required'",
  "nation.tier, 'empire'",
  'upgradeEmpire',
]) {
  assert.ok(nationEmpireContract.includes(nationToken), `nation empire contract should prove ${nationToken}`)
}

for (const objectiveToken of [
  "contractId, 'nation_war_objective_read_model_v1'",
  "organizationKind, 'nation'",
  "nationTier, 'empire'",
  "'region_control'",
  "'state_capital'",
  "'luoyang_control'",
  "'empire_status'",
  "'east_han_unification'",
  'East Han thirteen states',
]) {
  assert.ok(nationWarObjectiveContract.includes(objectiveToken), `nation war objective contract should prove ${objectiveToken}`)
}

for (const currentGoalToken of [
  "'empire:upgrade-and-command'",
  "'unification:east-han-thirteen-states'",
  'nation_midgame_frontend',
  '国家中局|同盟|王国|帝国|十三州',
]) {
  assert.ok(currentGoalsContract.includes(currentGoalToken), `current goals contract should prove ${currentGoalToken}`)
}

for (const uiCopyToken of [
  'NATION_MIDGAME_PLAYER_UI_COPY_CONTRACT := "nation_midgame_player_ui_copy_v1"',
  '从同盟发育到东汉十三州',
  '同盟发育',
  '建国称王',
  '晋升帝国',
  '东汉十三州',
  'player-visible nation midgame copy helper must not expose engineering copy',
]) {
  assert.ok(playerUiCopyContract.includes(uiCopyToken), `nation UI copy contract should prove ${uiCopyToken}`)
}

for (const skeletonToken of [
  'nation_midgame_frontend_skeleton_v1',
  'organization_membership_authority_v1',
  'region_control',
  'state_capital',
  'luoyang_control',
  'empire_status',
  'east_han_unification',
  'world_open_main_city_organization_nation_midgame_frontend',
]) {
  assert.ok(frontendSkeletonContract.includes(skeletonToken), `nation frontend skeleton contract should prove ${skeletonToken}`)
}

for (const bridgeToken of [
  'recordNationMidgameRealmObjectiveBridge',
  'kingdomObjectivePrerequisiteVisible',
  'empireObjectivePrerequisiteVisible',
  'usesOrganizationNationSurface',
  'realm_objective_bridge_only_not_full_kingdom_empire_creation',
]) {
  assert.ok(realmObjectiveBridgeContract.includes(bridgeToken), `realm objective bridge contract should prove ${bridgeToken}`)
}

const organizationNationProducerStates = [
  'membership_changed',
  'organization_objective_updated',
  'nation_founded_or_profile_changed',
  'kingdom_empire_progressed',
  'luoyang_control_chain',
  'organization_diplomacy_body',
  'objective_blocked_or_denied',
  'dedupe',
  'scope_denied',
  'recovery',
]
assert.equal(organizationNationProducerStates.length, 10)

const organizationNationProducerFixture = {
  contractId,
  category: 'organization_nation',
  playerHistoryTitle: '同盟目标推进',
  playerHistoryActorName: '青州同盟',
  playerHistorySummary: '同盟已把洛阳控制进度接入王国目标。',
  playerHistoryLocation: '洛阳',
  playerHistoryTarget: '王国目标',
  playerHistoryResultLabel: '已推进',
  playerHistoryConsequence: '成员可以继续巩固洛阳，为建国称王做准备。',
  playerHistoryNextAction: '查看组织目标',
  playerHistorySeverity: 'high',
  outcomeState: 'organization_objective_updated',
  subjectBoundary: 'organization_body_not_ai_player',
  sourceRefs: {
    organizationId: 'summary-only-organization',
    realmObjectiveProgressId: 'summary-only-realm-objective',
  },
  dedupeKey: 'organization-nation:qingzhou:luoyang:kingdom-objective',
}

assert.equal(organizationNationProducerFixture.category, 'organization_nation')
assert.equal(organizationNationProducerFixture.outcomeState, 'organization_objective_updated')
assert.equal(organizationNationProducerFixture.subjectBoundary, 'organization_body_not_ai_player')
assert.ok(organizationNationProducerFixture.dedupeKey.startsWith('organization-nation:'))
assert.ok(organizationNationProducerFixture.sourceRefs.organizationId.length > 0)
assert.ok(organizationNationProducerFixture.sourceRefs.realmObjectiveProgressId.length > 0)

const playerVisibleCopy = [
  organizationNationProducerFixture.playerHistoryTitle,
  organizationNationProducerFixture.playerHistoryActorName,
  organizationNationProducerFixture.playerHistorySummary,
  organizationNationProducerFixture.playerHistoryLocation,
  organizationNationProducerFixture.playerHistoryTarget,
  organizationNationProducerFixture.playerHistoryResultLabel,
  organizationNationProducerFixture.playerHistoryConsequence,
  organizationNationProducerFixture.playerHistoryNextAction,
  '职务调整已生效。',
  '目标暂时受阻，请先满足控制条件。',
  '暂无权限查看这条组织记录。',
].join('\n')

for (const forbidden of [
  'organization_membership_authority_v1',
  'organization_diplomacy_authority_v1',
  'nation_midgame_frontend_skeleton_v1',
  'nation_midgame_player_ui_copy_v1',
  'organization_objective_internal',
  'organization_body_not_ai_player',
  'organization_not_ai_player',
  'nation_war_objective_read_model_v1',
  'realm_objective_bridge_only_not_full_kingdom_empire_creation',
  'region_control',
  'state_capital',
  'luoyang_control',
  'empire_status',
  'east_han_unification',
  'tier',
  'route',
  'backend',
  '/api/nation',
  '/api/world/action',
  'read model',
  'authority',
  'contract',
  'fixture',
  'gate',
  'debug',
  '5700',
  '150 levels',
  'sourceRefs',
  'snake_case',
]) {
  assert.equal(
    playerVisibleCopy.includes(forbidden),
    false,
    `organization/nation producer visible copy leaked implementation term: ${forbidden}`,
  )
}

console.log('[player_history_organization_nation_producer_packet_contract] all checks passed')
