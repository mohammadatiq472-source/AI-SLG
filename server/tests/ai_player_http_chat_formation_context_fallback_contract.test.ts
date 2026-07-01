import assert from 'node:assert/strict'
import {
  AI_PLAYER_ID,
  bootRegisteredAiPlayer,
  ensureFactionBudget,
  FACTION_ID,
  loadWorldState,
} from './helpers/aiPlayerHttpContractHarness'
import { readObject, requestJson } from './helpers/backendHarness'

async function run() {
  const backend = await bootRegisteredAiPlayer('ai_player_http_chat_formation_context_fallback_contract')
  const baseUrl = backend.baseUrl

  try {
    const world = await loadWorldState(baseUrl)
    const faction = world.factions[FACTION_ID]
    assert.ok(faction, 'player faction should exist before chat formation context fallback command')
    assert.deepEqual(
      faction.heroCommand.reserveHeroIds.slice(0, 3),
      ['100017', '100031', '100013'],
      'baseline reserve heroes should support deterministic three-hero context fallback command',
    )
    await ensureFactionBudget(baseUrl, 2, 8, 'chat formation context fallback command')

    const focus = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'setAiContextFocus',
      payload: {
        factionId: FACTION_ID,
        contextFocusId: 'focus_team',
        teamId: 'team_03',
        teamIndex: 3,
        teamName: '第三队',
        ownerType: 'ai',
        aiPlayerId: AI_PLAYER_ID,
        heroNames: ['诸葛亮', '周瑜', '马超'],
      },
    })
    assert.equal(focus.status, 200, `focus_team action failed: ${JSON.stringify(focus.data)}`)
    const focusData = readObject(focus.data)
    assert.equal(focusData.ok, true, `focus_team action rejected: ${JSON.stringify(focusData)}`)
    const focusWorld = readObject(focusData.world)
    const aiStateByPlayerId = readObject(readObject(focusWorld.slgDomainState).aiStateByPlayerId)
    const aiPlayerContext = readObject(readObject(aiStateByPlayerId[AI_PLAYER_ID]).contextMemorySummary)
    assert.equal(aiPlayerContext.teamId, 'team_03')
    assert.equal(aiPlayerContext.teamIndex, 3)
    assert.equal(aiPlayerContext.aiPlayerId, AI_PLAYER_ID)

    const response = await requestJson(
      baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/messages`,
      'POST',
      {
        senderId: 'human_alpha',
        senderName: '总督',
        body: '把刚刚那队换成诸葛亮、周瑜、马超，准备出动。',
      },
    )

    assert.equal(response.status, 200, `chat formation context fallback failed: ${JSON.stringify(response.data)}`)
    const payload = readObject(response.data)
    assert.equal(payload.ok, true)

    const proposal = readObject(payload.proposal)
    assert.equal(proposal.action, 'troop_train')
    assert.equal(proposal.source, 'human')
    assert.equal(proposal.status, 'executed')
    assert.deepEqual(readObject(proposal.args), {
      heroId: '100017',
      coHeroIds: ['100031', '100013'],
      tileId: faction.heroCommand.homeTileId,
      aiPlayerId: AI_PLAYER_ID,
      teamId: 'team_03',
      teamIndex: 3,
    })

    const aiMessage = readObject(payload.aiMessage)
    assert.match(String(aiMessage.body), /第3队已经切换好了/)
    assert.match(String(aiMessage.body), /诸葛亮、周瑜、马超/)
    const metadata = readObject(aiMessage.metadata)
    assert.equal(metadata.source, 'chat_explicit_formation_roster_executed')
    assert.equal(metadata.preferenceKind, 'formation_roster')
    assert.equal(metadata.targetAiPlayerId, AI_PLAYER_ID)
    assert.equal(metadata.targetTeamId, 'team_03')
    assert.equal(metadata.targetTeamIndex, 3)
    assert.equal(metadata.targetTeamSource, 'silent_context')
    assert.equal(metadata.receiptOk, true)

    const worldAfter = await loadWorldState(baseUrl)
    const deployedUnit = worldAfter.units.find((unit) =>
      unit.hero.id === 'hero_100017' &&
      unit.aiPlayerId === AI_PLAYER_ID &&
      unit.teamId === 'team_03' &&
      unit.teamIndex === 3
    )
    assert.ok(deployedUnit, 'context fallback chat command should deploy the requested roster to focused third team')
    assert.deepEqual(
      (deployedUnit.coHeroes ?? []).map((hero) => hero.id),
      ['hero_100031', 'hero_100013'],
      'context fallback chat command should write selected coHeroes into focused third-team unit',
    )
  } finally {
    await backend.stop()
  }
}

run().catch((error) => {
  console.error('[ai_player_http_chat_formation_context_fallback_contract] failed:', error)
  process.exitCode = 1
})
