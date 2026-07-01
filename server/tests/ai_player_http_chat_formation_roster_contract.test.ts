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
  const backend = await bootRegisteredAiPlayer('ai_player_http_chat_formation_roster_contract')
  const baseUrl = backend.baseUrl

  try {
    const world = await loadWorldState(baseUrl)
    const faction = world.factions[FACTION_ID]
    assert.ok(faction, 'player faction should exist before chat formation command')
    assert.deepEqual(
      faction.heroCommand.reserveHeroIds.slice(0, 3),
      ['100017', '100031', '100013'],
      'baseline reserve heroes should support deterministic three-hero chat formation command',
    )
    await ensureFactionBudget(baseUrl, 2, 8, 'chat formation roster command')

    const response = await requestJson(
      baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/messages`,
      'POST',
      {
        senderId: 'human_alpha',
        senderName: '总督',
        body: '第二队换成诸葛亮、周瑜、马超，准备出动。',
      },
    )

    assert.equal(response.status, 200, `chat formation command failed: ${JSON.stringify(response.data)}`)
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
      teamId: 'team_02',
      teamIndex: 2,
    })

    assert.equal(payload.proposalMessage, undefined, 'explicit chat roster command should not surface a manual proposal card')
    const receipt = readObject(payload.receipt)
    assert.equal(receipt.ok, true)
    assert.equal(receipt.worldAction, 'deployReserveHero')

    const aiMessage = readObject(payload.aiMessage)
    assert.equal(aiMessage.kind, 'message')
    assert.equal(aiMessage.authorType, 'ai')
    assert.match(String(aiMessage.body), /已经切换好了/)
    assert.match(String(aiMessage.body), /诸葛亮、周瑜、马超/)
    const metadata = readObject(aiMessage.metadata)
    assert.equal(metadata.source, 'chat_explicit_formation_roster_executed')
    assert.equal(metadata.preferenceKind, 'formation_roster')
    assert.deepEqual(metadata.requestedHeroIds, ['100017', '100031', '100013'])
    assert.equal(metadata.targetAiPlayerId, AI_PLAYER_ID)
    assert.equal(metadata.targetTeamId, 'team_02')
    assert.equal(metadata.targetTeamIndex, 2)
    assert.equal(metadata.targetTeamSource, 'explicit_message')
    assert.equal(metadata.receiptOk, true)

    const worldAfter = await loadWorldState(baseUrl)
    const deployedUnit = worldAfter.units.find((unit) => unit.hero.id === 'hero_100017')
    assert.ok(deployedUnit, 'chat formation command should deploy the requested lead hero')
    assert.equal(deployedUnit.aiPlayerId, AI_PLAYER_ID, 'chat formation command should bind deployed unit to the AI player')
    assert.equal(deployedUnit.teamId, 'team_02', 'chat formation command should bind deployed unit to requested teamId')
    assert.equal(deployedUnit.teamIndex, 2, 'chat formation command should bind deployed unit to requested teamIndex')
    assert.deepEqual(
      (deployedUnit.coHeroes ?? []).map((hero) => hero.id),
      ['hero_100031', 'hero_100013'],
      'chat formation command should write selected coHeroes into deployed unit',
    )
  } finally {
    await backend.stop()
  }
}

run().catch((error) => {
  console.error('[ai_player_http_chat_formation_roster_contract] failed:', error)
  process.exitCode = 1
})
