import assert from 'node:assert/strict'
import { bootRegisteredAiPlayer, FACTION_ID } from './helpers/aiPlayerHttpContractHarness'
import { readObject, requestJson } from './helpers/backendHarness'

const AI_PLAYER_ID = 'ai_player_jihan_vanguard'
const TEAM_ID = 'team_02'

async function main() {
  const backend = await bootRegisteredAiPlayer('ai_context_focus_team_contract')
  try {
    const focus = await requestJson(backend.baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'setAiContextFocus',
      payload: {
        factionId: FACTION_ID,
        contextFocusId: 'focus_team',
        teamId: TEAM_ID,
        teamIndex: 2,
        teamName: '第二队',
        ownerType: 'ai',
        aiPlayerId: AI_PLAYER_ID,
        heroNames: ['刘备', '关羽', '张飞'],
      },
    })
    assert.equal(focus.status, 200, `focus_team action failed: ${JSON.stringify(focus.data)}`)
    const data = readObject(focus.data)
    assert.equal(data.ok, true, `focus_team action rejected: ${JSON.stringify(data)}`)
    assert.equal(data.contextFocusId, 'focus_team')
    assert.equal(data.relatedId, TEAM_ID)

    const world = readObject(data.world)
    const slgDomainState = readObject(world.slgDomainState)
    const aiStateByFaction = readObject(slgDomainState.aiStateByFaction)
    const aiState = readObject(aiStateByFaction[FACTION_ID])
    const contextMemorySummary = readObject(aiState.contextMemorySummary)
    assert.equal(aiState.contextFocusId, 'focus_team')
    assert.equal(contextMemorySummary.focusId, 'focus_team')
    assert.equal(contextMemorySummary.relatedId, TEAM_ID)
    assert.equal(contextMemorySummary.teamId, TEAM_ID)
    assert.equal(contextMemorySummary.teamIndex, 2)
    assert.equal(contextMemorySummary.teamName, '第二队')
    assert.equal(contextMemorySummary.ownerType, 'ai')
    assert.equal(contextMemorySummary.aiPlayerId, AI_PLAYER_ID)
    assert.deepEqual(contextMemorySummary.heroNames, ['刘备', '关羽', '张飞'])

    const aiStateByPlayerId = readObject(slgDomainState.aiStateByPlayerId)
    const aiPlayerState = readObject(aiStateByPlayerId[AI_PLAYER_ID])
    const aiPlayerContextMemorySummary = readObject(aiPlayerState.contextMemorySummary)
    assert.equal(aiPlayerState.contextFocusId, 'focus_team')
    assert.equal(aiPlayerContextMemorySummary.focusId, 'focus_team')
    assert.equal(aiPlayerContextMemorySummary.relatedId, TEAM_ID)
    assert.equal(aiPlayerContextMemorySummary.teamId, TEAM_ID)
    assert.equal(aiPlayerContextMemorySummary.teamIndex, 2)
    assert.equal(aiPlayerContextMemorySummary.aiPlayerId, AI_PLAYER_ID)
    assert.deepEqual(aiPlayerContextMemorySummary.heroNames, ['刘备', '关羽', '张飞'])

    const missingTeam = await requestJson(backend.baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'setAiContextFocus',
      payload: {
        factionId: FACTION_ID,
        contextFocusId: 'focus_team',
        aiPlayerId: AI_PLAYER_ID,
      },
    })
    assert.equal(missingTeam.status, 200, `missing team request should still return action response: ${JSON.stringify(missingTeam.data)}`)
    const missingTeamData = readObject(missingTeam.data)
    assert.equal(missingTeamData.ok, false, 'focus_team without teamId should be rejected')
    assert.match(String(missingTeamData.message), /队伍 ID/)

    console.log('[ai_context_focus_team_contract] all checks passed')
  } finally {
    await backend.stop()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
