import assert from 'node:assert/strict'
import type { WorldState } from '../../shared/contracts/game/world'
import {
  AI_PLAYER_ID,
  FACTION_ID,
  GOVERNOR_PLAYER_ID,
  bootRegisteredAiPlayer,
  createApproveExecuteProposal,
  ensureFactionBudget,
  loadWorldState,
  assertSuccessfulReceipt,
} from './helpers/aiPlayerHttpContractHarness'
import { readArray, readObject, requestJson } from './helpers/backendHarness'

type RecruitPoolId = 'pool_standard' | 'pool_season' | 'pool_limited'

function resolveRecruitPoolId(world: WorldState): RecruitPoolId {
  const currentPoolId = world.slgDomainState?.recruitStateByFaction?.[FACTION_ID]?.selectedPoolId
  const nextPoolId = ['pool_standard', 'pool_season', 'pool_limited'].find((candidate) => candidate !== currentPoolId)
  return (nextPoolId ?? 'pool_standard') as RecruitPoolId
}

async function run() {
  const backend = await bootRegisteredAiPlayer('ai_player_http_recruit_contract_recruit')
  const baseUrl = backend.baseUrl

  try {
    const worldBeforeRecruit = await loadWorldState(baseUrl)
    const factionBefore = worldBeforeRecruit.factions[FACTION_ID]
    assert.ok(factionBefore, 'player faction should exist before recruit baseline')

    const recruitArgs = {
      poolId: 'pool_standard' as RecruitPoolId,
      count: 1,
    }

    const recruitSuccess = await createApproveExecuteProposal(baseUrl, 'recruit_commander', recruitArgs, 'Recruit baseline success')
    assert.equal(recruitSuccess.proposal.status, 'executed')
    assertSuccessfulReceipt('recruit_commander', recruitSuccess.receipt, 'recruitProspectHero')
    assert.equal(recruitSuccess.receipt.failureCode, null, 'recruit_commander baseline success should be failure free')

    const worldAfterRecruit = await loadWorldState(baseUrl)
    const factionAfter = worldAfterRecruit.factions[FACTION_ID]
    assert.ok(factionAfter, 'player faction should exist after recruit baseline success')
    assert.equal(
      factionAfter.heroCommand.rosterHeroIds.length,
      factionBefore.heroCommand.rosterHeroIds.length + 1,
      'recruit_commander should append one hero into roster',
    )
    assert.equal(
      factionAfter.heroCommand.reserveHeroIds.length,
      factionBefore.heroCommand.reserveHeroIds.length + 1,
      'recruit_commander should append one hero into reserve',
    )
    const recruitedRosterHeroIds = factionAfter.heroCommand.rosterHeroIds.filter(
      (heroId) => !factionBefore.heroCommand.rosterHeroIds.includes(heroId),
    )
    const recruitedReserveHeroIds = factionAfter.heroCommand.reserveHeroIds.filter(
      (heroId) => !factionBefore.heroCommand.reserveHeroIds.includes(heroId),
    )
    assert.deepEqual(recruitedRosterHeroIds, recruitedReserveHeroIds, 'recruited hero should be the same roster/reserve body change')

    const subjectAfterRecruitResponse = await requestJson(
      baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
      undefined,
      60_000,
    )
    assert.equal(
      subjectAfterRecruitResponse.status,
      200,
      `subject after recruit_commander failed: ${JSON.stringify(subjectAfterRecruitResponse.data)}`,
    )
    const subjectAfterRecruit = readObject(readObject(subjectAfterRecruitResponse.data).subject)
    const recruitRecentBodyChanges = readObject(subjectAfterRecruit.recentBodyChanges)
    assert.equal(recruitRecentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
    const recruitBodyChangeItems = readArray(recruitRecentBodyChanges.items).map((item) => readObject(item))
    const recruitBodyChange = recruitBodyChangeItems.find((item) => item.action === 'recruit_commander')
    assert.ok(recruitBodyChange, 'recruit_commander receipt must become a subject body change')
    assert.equal(recruitBodyChange.bodyNode, 'generals_and_troops')
    assert.equal(recruitBodyChange.status, 'completed')
    assert.equal(recruitBodyChange.poolId, recruitArgs.poolId)
    assert.deepEqual(readArray(recruitBodyChange.heroIds), recruitedRosterHeroIds)
    assert.deepEqual(readArray(recruitBodyChange.rosterHeroIds), recruitedRosterHeroIds)
    assert.deepEqual(readArray(recruitBodyChange.reserveHeroIds), recruitedReserveHeroIds)
    assert.equal(recruitBodyChange.nextSubjectFocus, 'troops')
    assert.equal(recruitBodyChange.visibleToAi, true)
    assert.equal(recruitBodyChange.governanceApprovedBeforeExecution, true)
    assert.equal(recruitBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
    assert.equal(typeof recruitBodyChange.governanceApprovedAt, 'string')

    const recruitHistoryAnchorItems = readArray(readObject(subjectAfterRecruit.recentHistoryAnchors).items).map((item) => readObject(item))
    const recruitHistoryAnchor = recruitHistoryAnchorItems.find((item) => (
      item.action === 'recruit_commander' &&
      item.bodyNode === 'generals_and_troops' &&
      item.proposalId === recruitBodyChange.proposalId
    ))
    assert.ok(recruitHistoryAnchor, 'recruit_commander body change must be linked to subject history')
    assert.equal(recruitHistoryAnchor.status, 'completed')
    assert.equal(recruitHistoryAnchor.poolId, recruitArgs.poolId)
    assert.deepEqual(readArray(recruitHistoryAnchor.heroIds), recruitedRosterHeroIds)
    assert.deepEqual(readArray(recruitHistoryAnchor.rosterHeroIds), recruitedRosterHeroIds)
    assert.deepEqual(readArray(recruitHistoryAnchor.reserveHeroIds), recruitedReserveHeroIds)
    assert.equal(recruitHistoryAnchor.nextSubjectFocus, 'troops')

    const worldBeforePoolSelect = await loadWorldState(baseUrl)
    const poolId = resolveRecruitPoolId(worldBeforePoolSelect)
    const recruitPoolSelect = await createApproveExecuteProposal(
      baseUrl,
      'recruit_pool_select',
      { poolId },
      `Set recruit pool to ${poolId}`,
    )
    assertSuccessfulReceipt('recruit_pool_select', recruitPoolSelect.receipt, 'setRecruitSelectedPool')
    assert.equal(recruitPoolSelect.receipt.failureCode, null, 'recruit_pool_select should be success receipt')

    const worldAfterPoolSelect = await loadWorldState(baseUrl)
    assert.equal(
      worldAfterPoolSelect.slgDomainState?.recruitStateByFaction?.[FACTION_ID]?.selectedPoolId,
      poolId,
      'recruit_pool_select should set selected pool id',
    )

    await ensureFactionBudget(baseUrl, 2, 8, 'troop train')
    const worldBeforeTroopTrain = await loadWorldState(baseUrl)
    const troopTrainReserveHeroIds = worldBeforeTroopTrain.factions[FACTION_ID]?.heroCommand.reserveHeroIds ?? []
    assert.ok(troopTrainReserveHeroIds.length >= 3, 'troop_train formation test should have three reserve heroes')
    const troopTrainFormationHeroIds = troopTrainReserveHeroIds.slice(0, 3)
    const troopTrain = await createApproveExecuteProposal(
      baseUrl,
      'troop_train',
      {
        heroId: troopTrainFormationHeroIds[0],
        coHeroIds: troopTrainFormationHeroIds.slice(1),
        tileId: worldBeforeTroopTrain.factions[FACTION_ID]?.heroCommand.homeTileId,
      },
      'Smoke troop training execution with formal three-hero formation',
    )
    assertSuccessfulReceipt('troop_train', troopTrain.receipt, 'deployReserveHero')
    assert.equal(troopTrain.receipt.failureCode, null, 'troop_train should be success receipt')
    const worldAfterTroopTrain = await loadWorldState(baseUrl)
    const troopTrainFormationProfileHeroIds = troopTrainFormationHeroIds.map((heroId) => `hero_${heroId}`)
    const trainedUnit = worldAfterTroopTrain.units.find((unit) => unit.hero.id === troopTrainFormationProfileHeroIds[0])
    assert.ok(trainedUnit, 'troop_train should create a deployed unit for the requested main hero')
    assert.equal(trainedUnit.aiPlayerId, AI_PLAYER_ID, 'troop_train should assign the deployed unit to the governed AI player')
    assert.deepEqual(
      (trainedUnit.coHeroes ?? []).map((hero) => hero.id),
      troopTrainFormationProfileHeroIds.slice(1),
      'AI troop_train should pass coHeroIds through to deployed unit.coHeroes',
    )
    assert.deepEqual(
      trainedUnit.mapVisual?.formationSlots.map((slot) => slot.heroId),
      troopTrainFormationProfileHeroIds,
      'AI troop_train should expose the resulting three-hero formation to Godot map visuals',
    )

    const subjectResponse = await requestJson(
      baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
      undefined,
      60_000,
    )
    assert.equal(subjectResponse.status, 200, `subject after troop_train failed: ${JSON.stringify(subjectResponse.data)}`)
    const subject = readObject(readObject(subjectResponse.data).subject)
    const subjectUnits = readArray(subject.units).map((item) => readObject(item))
    const subjectTrainedUnit = subjectUnits.find((unit) => unit.unitId === trainedUnit.id)
    assert.ok(subjectTrainedUnit, 'troop_train should make the deployed unit visible in the AI subject units array')
    assert.equal(subjectTrainedUnit.heroLevel, trainedUnit.hero.level)
    assert.equal(subjectTrainedUnit.heroTroopType, trainedUnit.hero.troopType)
    assert.equal(readArray(subjectTrainedUnit.coHeroes).length, 2)

    const recentBodyChanges = readObject(subject.recentBodyChanges)
    assert.equal(recentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
    const bodyChangeItems = readArray(recentBodyChanges.items).map((item) => readObject(item))
    const trainBodyChange = bodyChangeItems.find((item) => item.action === 'troop_train')
    assert.ok(trainBodyChange, 'troop_train receipt must become a subject body change')
    assert.equal(trainBodyChange.bodyNode, 'generals_and_troops')
    assert.equal(trainBodyChange.status, 'completed')
    assert.equal(trainBodyChange.unitId, trainedUnit.id)
    assert.deepEqual(readArray(trainBodyChange.heroIds), troopTrainFormationProfileHeroIds)
    assert.equal(trainBodyChange.teamId, trainedUnit.teamId ?? '')
    assert.equal(trainBodyChange.teamIndex, trainedUnit.teamIndex ?? 0)
    assert.equal(trainBodyChange.strength, trainedUnit.strength)
    assert.equal(trainBodyChange.supply, trainedUnit.supply)
    assert.equal(trainBodyChange.nextSubjectFocus, 'troops')
    assert.equal(trainBodyChange.visibleToAi, true)
    assert.equal(trainBodyChange.governanceApprovedBeforeExecution, true)
    assert.equal(trainBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
    assert.equal(typeof trainBodyChange.governanceApprovedAt, 'string')
  } finally {
    await backend.stop()
  }
}

run().catch((error) => {
  console.error('[ai_player_http_recruit_contract] failed:', error)
  process.exitCode = 1
})
