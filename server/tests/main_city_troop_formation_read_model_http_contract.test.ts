import assert from 'node:assert/strict'
import {
  AI_PLAYER_ACTION_WHITELIST,
  AI_PLAYER_ID,
  bootRegisteredAiPlayer,
  FACTION_ID,
  GOVERNOR_PLAYER_ID,
  loadWorldState,
} from './helpers/aiPlayerHttpContractHarness'
import { readArray, readObject, requestJson } from './helpers/backendHarness'
import { getMainCityTroopFormationReadModelResponse } from '../src/application/world/mainCityTroopFormationReadModel'

async function main() {
  const backend = await bootRegisteredAiPlayer('main_city_troop_formation_read_model_http_contract')
  try {
    const worldBefore = await loadWorldState(backend.baseUrl)
    const homeTileId = worldBefore.factions[FACTION_ID]?.heroCommand.homeTileId
    assert.ok(homeTileId, 'player faction should expose home tile for formal troop formation')

    const deploy = await requestJson(
      backend.baseUrl,
      '/api/world/action?includeWorld=true',
      'POST',
      {
        action: 'deployReserveHero',
        payload: {
          factionId: FACTION_ID,
          heroId: '100017',
          coHeroIds: ['100031', '100013'],
          tileId: homeTileId,
          aiPlayerId: AI_PLAYER_ID,
          teamId: 'team_02',
          teamIndex: 2,
        },
      },
      60_000,
    )
    assert.equal(deploy.status, 200, `deploy formal three-hero unit failed: ${JSON.stringify(deploy.data)}`)
    const deployData = readObject(deploy.data)
    assert.equal(deployData.ok, true, `deploy formal three-hero unit rejected: ${JSON.stringify(deployData)}`)
    assert.equal(deployData.aiPlayerId, AI_PLAYER_ID)
    assert.equal(deployData.teamId, 'team_02')
    assert.equal(deployData.teamIndex, 2)
    const deployedWorld = readObject(deployData.world)
    const deployedUnits = readArray(deployedWorld.units).map(readObject)
    const deployedUnit = deployedUnits.find((unit) => unit.id === deployData.unitId)
    assert.ok(deployedUnit, 'deploy response world should include the newly deployed formal unit')
    assert.equal(deployedUnit.aiPlayerId, AI_PLAYER_ID)
    assert.equal(deployedUnit.teamId, 'team_02')
    assert.equal(deployedUnit.teamIndex, 2)

    const registerBeta = await requestJson(
      backend.baseUrl,
      '/api/ai/players',
      'POST',
      {
        aiPlayerId: 'player_operator_beta',
        displayName: 'Player Operator Beta',
        governorPlayerId: GOVERNOR_PLAYER_ID,
        factionId: FACTION_ID,
        actionWhitelist: AI_PLAYER_ACTION_WHITELIST,
      },
      30_000,
    )
    assert.equal(registerBeta.status, 200, `register second AI player failed: ${JSON.stringify(registerBeta.data)}`)

    const response = await requestJson(
      backend.baseUrl,
      `/api/world/main-city/troop-formation?factionId=${FACTION_ID}&playerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
      undefined,
      30_000,
    )

    assert.equal(response.status, 200, `troop formation read model route failed: ${JSON.stringify(response.data)}`)
    const root = readObject(response.data)
    const model = readObject(root.mainCityTroopFormation)
    assert.equal(model.schema_version, 'main_city_troop_formation_read_model_v4')
    assert.equal(model.data_source, 'backend_ai_player_main_city_state_v1')
    assert.equal(model.read_model_authority_source, 'backend_ai_player_main_city_state_v1')

    const teams = readArray(model.teams).map(readObject)
    assert.ok(teams.length >= 2, 'backend read model should expose human team plus governed AI team')

    const humanTeam = teams.find((team) => team.owner_type === 'human')
    assert.ok(humanTeam, 'backend read model should keep a human formation team')
    assert.equal(humanTeam.faction_id, FACTION_ID)

    const aiTeam = teams.find((team) => team.owner_type === 'ai' && team.ai_player_id === AI_PLAYER_ID)
    assert.ok(aiTeam, `backend read model should include governed AI team ${AI_PLAYER_ID}`)
    assert.equal(aiTeam.ai_player_name, 'Player Operator Alpha')
    assert.equal(aiTeam.controller_label, 'AI玩家 / Player Operator Alpha')
    assert.equal(aiTeam.governor_player_id, GOVERNOR_PLAYER_ID)
    assert.equal(aiTeam.faction_id, FACTION_ID)
    assert.equal(aiTeam.read_model_source, 'governed_ai_player_runtime')
    assert.equal(aiTeam.team_id, 'team_02')
    assert.equal(aiTeam.team_index, 2)
    assert.equal(aiTeam.source_unit_id, deployData.unitId)
    assert.equal(aiTeam.source_team_id, 'team_02')
    assert.equal(aiTeam.source_team_index, 2)
    assert.equal(aiTeam.team_bind_source, 'unit_ai_player_id')

    const slots = readArray(aiTeam.slots).map(readObject)
    assert.equal(slots.length, 3, 'AI team should expose three hero slots for drill-ground display')
    assert.ok(slots.every((slot) => String(slot.controller_label ?? '').includes('Player Operator Alpha')))
    assert.ok(slots.every((slot) => slot.read_model_source === 'world_unit_coheroes'))
    assert.deepEqual(
      slots.map((slot) => slot.hero_id),
      ['100017', '100031', '100013'],
      'AI team slots should come from the formal deployed unit hero/coHeroes order',
    )
    assert.deepEqual(
      slots.map((slot) => slot.general_name),
      ['诸葛亮', '周瑜', '马超'],
      'AI team slots should carry formal deployed unit hero/coHeroes names',
    )
    assert.deepEqual(
      slots.map((slot) => slot.troop_type),
      ['步兵', '步兵', '骑兵'],
      'AI team slots should carry formal deployed unit troop types, not template troop labels',
    )
    assert.deepEqual(
      slots.map((slot) => slot.portrait_asset_key),
      [
        'formal_pack.portrait.zhuge_liang_mature_beifa_v1',
        'formal_pack.portrait.zhou_yu_mature_chibi_v1',
        'formal_pack.portrait.ma_chao_mature_xiliang_retreat_v1',
      ],
      'AI team slots should normalize deployed hero portraitKey into formal-pack portrait assets',
    )
    assert.deepEqual(
      slots.map((slot) => readObject(slot.asset_ref).portraitAssetKey),
      [
        'formal_pack.portrait.zhuge_liang_mature_beifa_v1',
        'formal_pack.portrait.zhou_yu_mature_chibi_v1',
        'formal_pack.portrait.ma_chao_mature_xiliang_retreat_v1',
      ],
      'AI team asset_ref should carry the same formal-pack portrait assets consumed by Godot',
    )

    const betaTeam = teams.find((team) => team.owner_type === 'ai' && team.ai_player_id === 'player_operator_beta')
    assert.ok(betaTeam, 'backend read model should include the second governed AI team')
    assert.equal(betaTeam.source_unit_id, undefined)
    assert.equal(betaTeam.team_bind_source, 'none')
    assert.ok(
      readArray(betaTeam.slots).map(readObject).every((slot) => slot.read_model_source === 'static_visual_template_pending_formal_unit'),
      'unbound second AI team must not steal the first AI player formal unit by array order',
    )

    const multiTeamWorld = structuredClone(deployedWorld)
    const secondTeamUnit = structuredClone(deployedUnit)
    secondTeamUnit.id = `${deployedUnit.id}_team_03`
    secondTeamUnit.name = `${deployedUnit.name} team 03`
    secondTeamUnit.teamId = 'team_03'
    secondTeamUnit.teamIndex = 3
    secondTeamUnit.aiPlayerId = AI_PLAYER_ID
    readArray(multiTeamWorld.units).push(secondTeamUnit)
    const multiTeamModelRoot = getMainCityTroopFormationReadModelResponse({
      world: multiTeamWorld as never,
      factionId: FACTION_ID,
      governorPlayerId: GOVERNOR_PLAYER_ID,
      observedAiPlayer: {
        aiPlayerId: AI_PLAYER_ID,
        displayName: 'Player Operator Alpha',
        governorPlayerId: GOVERNOR_PLAYER_ID,
        factionId: FACTION_ID,
        mode: 'ai_player_readonly',
      } as never,
    })
    const multiTeamModel = readObject(readObject(multiTeamModelRoot).mainCityTroopFormation)
    const alphaTeams = readArray(multiTeamModel.teams)
      .map(readObject)
      .filter((team) => team.owner_type === 'ai' && team.ai_player_id === AI_PLAYER_ID)
    assert.equal(alphaTeams.length, 2, 'one governed AI player should expand to one visible team per bound formal unit')
    assert.deepEqual(
      alphaTeams.map((team) => team.team_index),
      [2, 3],
      'expanded AI teams should preserve formal teamIndex order',
    )
    assert.deepEqual(
      alphaTeams.map((team) => team.source_unit_id),
      [deployedUnit.id, secondTeamUnit.id],
      'expanded AI teams should bind different formal units',
    )
    assert.ok(alphaTeams.every((team) => team.ai_player_id === AI_PLAYER_ID), 'expanded teams should keep the same AI owner')

    console.log('[main_city_troop_formation_read_model_http_contract] all checks passed')
  } finally {
    await backend.stop()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
