import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  buildSessionPersistPath,
  getAvailablePort,
  readArray,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  waitForHealth,
  type TailState,
} from './helpers/backendHarness'
import { aiPlayerHomeCityCandidatesResponseSchema, bindAiPlayerHomeCityResponseSchema } from '../../shared/schemas/aiPlayer'

async function requestJsonWithBearer(
  baseUrl: string,
  path: string,
  method: 'GET' | 'POST',
  token: string,
  body?: Record<string, unknown>,
) {
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const raw = await response.text()
  return {
    status: response.status,
    data: raw.trim().length > 0 ? JSON.parse(raw) as unknown : null,
  }
}

function seedSubjectWorldState(): { path: string; unitId: string; rogueUnitId: string } {
  const world = createInitialWorldState()
  const faction = world.factions.player
  assert.ok(faction, 'subject fixture requires player faction')
  const unit = world.units.find((candidate) => candidate.faction === 'player')
  assert.ok(unit, 'subject fixture requires a player unit')
  const rogueUnit = structuredClone(unit)
  rogueUnit.id = 'subject_rogue_alliance_defense_unit'
  rogueUnit.name = 'Subject Rogue Alliance Defense Unit'
  const resourceTile = world.map.tiles.find((tile) => tile.type === 'resource') ?? world.map.tiles[0]
  assert.ok(resourceTile, 'subject fixture requires a map tile')

  resourceTile.id = 'subject_resource_iron_l3'
  resourceTile.name = 'Subject Iron L3'
  resourceTile.type = 'resource'
  resourceTile.owner = 'player'
  resourceTile.resourceKind = 'iron'
  resourceTile.resourceLevel = 3
  resourceTile.enemyPressure = 0

  unit.tileId = resourceTile.id
  unit.status = '待命'
  unit.currentTask = undefined
  unit.strength = Math.max(unit.strength, 100)
  unit.mobility = Math.max(unit.mobility, 100)
  unit.supply = Math.max(unit.supply, 100)
  unit.aiPlayerId = 'subject_alpha'
  rogueUnit.tileId = resourceTile.id
  rogueUnit.status = '待命'
  rogueUnit.currentTask = undefined
  rogueUnit.strength = Math.max(rogueUnit.strength, 100)
  rogueUnit.mobility = Math.max(rogueUnit.mobility, 100)
  rogueUnit.supply = Math.max(rogueUnit.supply, 100)
  rogueUnit.aiPlayerId = undefined
  unit.teamId = 'subject_team_01'
  unit.teamIndex = 1
  unit.hero.level = 18
  unit.hero.starLevel = 2
  unit.hero.troopType = 'infantry'
  unit.coHeroes = [{
    ...unit.hero,
    id: 'subject_cohero_alpha',
    name: 'Subject CoHero Alpha',
    title: '副将',
    level: 12,
    troopType: 'archer',
  } as typeof unit.hero & { starLevel?: number }]
  ;(unit.coHeroes[0] as typeof unit.hero & { starLevel?: number }).starLevel = 1
  unit.mapVisual = {
    visualType: 'infantry',
    primaryTroopType: 'infantry',
    ownerType: 'ai',
    currentTileId: resourceTile.id,
    status: unit.status,
    label: 'Subject Alpha Team',
    formationSlots: [
      {
        role: 'center',
        heroId: unit.hero.id,
        heroName: unit.hero.name,
        troopType: 'infantry',
        visualType: 'infantry',
      },
      {
        role: 'camp',
        heroId: 'subject_cohero_alpha',
        heroName: 'Subject CoHero Alpha',
        troopType: 'archer',
        visualType: 'archer',
      },
    ],
  }
  world.units.push(rogueUnit)

  faction.aiPlayers = [{
    id: 'subject_alpha',
    name: 'Subject Alpha',
    factionId: 'player',
    unitIds: [unit.id],
    specialty: 'logistics',
  }]
  faction.aiResourceAccounts = {
    subject_alpha: {
      aiPlayerId: 'subject_alpha',
      governorPlayerId: 'human_alpha',
      factionId: 'player',
      resources: {
        food: 1,
        wood: 2,
        stone: 3,
        iron: 4,
      },
      updatedTick: world.tick,
    },
  }
  faction.aiResourceGatherClaims = {}
  world.feedback.battleRecords.unshift({
    id: 'subject_battle_guard_loss',
    tick: world.tick + 1,
    regionId: 'subject_region',
    region: 'Subject Front',
    tileId: resourceTile.id,
    ownerFactionId: 'player',
    attackerFaction: 'player',
    attackerFactionId: 'player',
    attackerUnitId: unit.id,
    aiPlayerId: 'subject_alpha',
    attackerAiPlayerId: 'subject_alpha',
    outcome: 'loss',
    attackerLoss: 42,
    defenderLoss: 8,
    alliedSupport: 0,
    summary: 'Subject Alpha failed to break the resource guard.',
    reportKind: 'resource_guard',
    result: '败',
    time: '2026-06-14T00:00:00.000Z',
    location: resourceTile.name,
    replayRequestId: 'subject_replay_guard_loss',
  })
  world.feedback.battleRecords.unshift({
    id: 'subject_battle_retention_expired',
    tick: world.tick + 2,
    regionId: 'subject_region',
    region: 'Subject Front',
    tileId: resourceTile.id,
    ownerFactionId: 'player',
    attackerFaction: 'player',
    attackerFactionId: 'player',
    attackerUnitId: unit.id,
    aiPlayerId: 'subject_alpha',
    attackerAiPlayerId: 'subject_alpha',
    outcome: 'loss',
    attackerLoss: 16,
    defenderLoss: 5,
    alliedSupport: 0,
    summary: 'Subject Alpha replay exists but retention has expired.',
    reportKind: 'resource_guard',
    result: '败',
    time: '2026-06-14T00:01:00.000Z',
    location: resourceTile.name,
    replayRequestId: 'subject_replay_retention_expired',
  })
  world.history.executionReplays.unshift({
    requestId: 'subject_replay_retention_expired',
    source: 'mock',
    strategicCommand: 'subject replay retention expired fixture',
    basedOnWorldVersion: world.worldVersion,
    createdTick: world.tick,
    createdWorldVersion: world.worldVersion,
    reviewAtTick: world.tick + 1,
    plan: {
      intent: 'subject replay retention expired fixture',
      priority: 'medium',
      reviewAfterTicks: 1,
      constraints: ['ai_player_subject_replay_retention_expired_contract'],
      orders: [
        {
          unitId: unit.id,
          action: 'recon',
          target: resourceTile.id,
        },
      ],
    },
    outcome: 'failed',
    completedTick: world.tick,
    completedWorldVersion: world.worldVersion,
    frames: [
      {
        tick: world.tick,
        worldVersion: world.worldVersion,
        label: 'Subject replay retention expired frame',
        frontlineSummary: 'Replay existed before retention expiry.',
        latestReports: [],
        highlights: [],
        orderStates: [],
      },
    ],
  })

  const path = buildSessionPersistPath('ai_player_subject_read_model_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { path, unitId: unit.id, rogueUnitId: rogueUnit.id }
}

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const seeded = seedSubjectWorldState()
  const child = spawnBackend(port, tail, {
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_subject_read_model_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_subject_read_model_session_state'),
    WORLD_STATE_PERSIST_PATH: seeded.path,
    REPLAY_RETENTION_MAX_AGE_MS: '0',
    AI_PLAYER_RUNTIME_MODEL: '',
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: '',
    AI_PLAYER_RUNTIME_MODEL_API_KEY: '',
    LLM_RELAY_MODEL: '',
    LLM_RELAY_URL: '',
    LLM_RELAY_API_KEY: '',
    LLM_RELAY_API_KEYS: '',
    OPENAI_API_KEY: '',
  })

  try {
    const health = await waitForHealth(baseUrl, 90_000)
    assert.ok(health?.ok, `backend health check failed; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: 'human_alpha',
    })
    assert.equal(join.status, 200, `session join failed: ${JSON.stringify(join.data)}`)
    const sessionToken = String(readObject(join.data).token ?? '')
    assert.ok(sessionToken.length > 0, 'subject fixture should receive session token')

    const register = await requestJson(baseUrl, '/api/ai/players', 'POST', {
      aiPlayerId: 'subject_alpha',
      displayName: 'Subject Alpha',
      governorPlayerId: 'human_alpha',
      factionId: 'player',
      actionWhitelist: [
        'battle_report_read',
        'march_move',
        'tile_occupy',
        'resource_gather',
        'troop_heal',
        'recruit_pool_select',
        'alliance_defense_assign',
        'alliance_defense_batch_assign',
      ],
    })
    assert.equal(register.status, 200, `register failed: ${JSON.stringify(register.data)}`)

    const candidates = await requestJson(
      baseUrl,
      '/api/ai/players/subject_alpha/home-city/candidates?governorPlayerId=human_alpha',
      'GET',
      undefined,
      60_000,
    )
    assert.equal(candidates.status, 200, `candidate list failed: ${JSON.stringify(candidates.data)}`)
    const candidatePayload = aiPlayerHomeCityCandidatesResponseSchema.parse(candidates.data)
    const selectedCandidate = candidatePayload.candidates[0]
    assert.ok(selectedCandidate, 'AI subject fixture must have a home-city candidate')

    const bind = await requestJson(baseUrl, '/api/ai/players/subject_alpha/home-city', 'POST', {
      governorPlayerId: 'human_alpha',
      centerTileId: selectedCandidate.centerTileId,
    })
    assert.equal(bind.status, 200, `binding failed: ${JSON.stringify(bind.data)}`)
    const binding = bindAiPlayerHomeCityResponseSchema.parse(bind.data)
    assert.equal(binding.binding?.footprintTileIds.length, 9)

    const createProposal = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: 'subject_alpha',
      action: 'recruit_pool_select',
      args: {
        poolId: 'pool_season',
      },
      reason: '为后续开荒切换招募方向。',
      source: 'human',
    })
    assert.equal(createProposal.status, 200, `create proposal failed: ${JSON.stringify(createProposal.data)}`)
    const proposalId = String(readObject(readObject(createProposal.data).proposal).proposalId ?? '')
    assert.ok(proposalId.length > 0, 'subject fixture proposal should return proposalId')

    const approved = await requestJson(baseUrl, `/api/ai/players/proposals/${proposalId}/approve`, 'POST', {
      approvedBy: 'human_alpha',
    })
    assert.equal(approved.status, 200, `approve proposal failed: ${JSON.stringify(approved.data)}`)

    const executed = await requestJson(baseUrl, `/api/ai/players/proposals/${proposalId}/execute`, 'POST', {
      executedBy: 'human_alpha',
      includeWorld: false,
    }, 60_000)
    assert.equal(executed.status, 200, `execute proposal failed: ${JSON.stringify(executed.data)}`)
    assert.equal(readObject(readObject(executed.data).receipt).ok, true)

    const gatherProposal = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: 'subject_alpha',
      action: 'resource_gather',
      args: {
        unitId: seeded.unitId,
        tileId: 'subject_resource_iron_l3',
      },
      reason: '收取已占资源地的一次性铁矿。',
      source: 'rule',
    })
    assert.equal(gatherProposal.status, 200, `create gather proposal failed: ${JSON.stringify(gatherProposal.data)}`)
    const gatherProposalId = String(readObject(readObject(gatherProposal.data).proposal).proposalId ?? '')
    assert.ok(gatherProposalId.length > 0, 'subject fixture gather proposal should return proposalId')

    const gatherApproved = await requestJson(baseUrl, `/api/ai/players/proposals/${gatherProposalId}/approve`, 'POST', {
      approvedBy: 'human_alpha',
    })
    assert.equal(gatherApproved.status, 200, `approve gather proposal failed: ${JSON.stringify(gatherApproved.data)}`)

    const gatherExecuted = await requestJson(baseUrl, `/api/ai/players/proposals/${gatherProposalId}/execute`, 'POST', {
      executedBy: 'human_alpha',
      includeWorld: false,
    }, 60_000)
    assert.equal(gatherExecuted.status, 200, `execute gather proposal failed: ${JSON.stringify(gatherExecuted.data)}`)
    const gatherReceipt = readObject(readObject(gatherExecuted.data).receipt)
    assert.equal(gatherReceipt.ok, true)
    assert.equal(gatherReceipt.action, 'resource_gather')

    const allianceDefenseProposal = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: 'subject_alpha',
      action: 'alliance_defense_assign',
      args: {
        unitId: seeded.unitId,
        targetTileId: 'subject_resource_iron_l3',
        summary: 'Subject Alpha guards its owned iron land.',
      },
      reason: '把已占资源地接入 AI 下一轮防守记忆。',
      source: 'rule',
    })
    assert.equal(
      allianceDefenseProposal.status,
      200,
      `create alliance defense proposal failed: ${JSON.stringify(allianceDefenseProposal.data)}`,
    )
    const allianceDefenseProposalId = String(readObject(readObject(allianceDefenseProposal.data).proposal).proposalId ?? '')
    assert.ok(allianceDefenseProposalId.length > 0, 'subject fixture alliance defense proposal should return proposalId')

    const allianceDefenseApproved = await requestJson(
      baseUrl,
      `/api/ai/players/proposals/${allianceDefenseProposalId}/approve`,
      'POST',
      { approvedBy: 'human_alpha' },
    )
    assert.equal(
      allianceDefenseApproved.status,
      200,
      `approve alliance defense proposal failed: ${JSON.stringify(allianceDefenseApproved.data)}`,
    )

    const allianceDefenseExecuted = await requestJson(
      baseUrl,
      `/api/ai/players/proposals/${allianceDefenseProposalId}/execute`,
      'POST',
      {
        executedBy: 'human_alpha',
        includeWorld: false,
      },
      60_000,
    )
    assert.equal(
      allianceDefenseExecuted.status,
      200,
      `execute alliance defense proposal failed: ${JSON.stringify(allianceDefenseExecuted.data)}`,
    )
    const allianceDefenseReceipt = readObject(readObject(allianceDefenseExecuted.data).receipt)
    assert.equal(allianceDefenseReceipt.ok, true)
    assert.equal(allianceDefenseReceipt.action, 'alliance_defense_assign')
    assert.equal(allianceDefenseReceipt.worldAction, 'queuePlanExecution')

    const clearAllianceDefensePlan = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'clearPlanExecution',
      payload: { factionId: 'player' },
    }, 60_000)
    assert.equal(clearAllianceDefensePlan.status, 200, `clear alliance defense plan failed: ${JSON.stringify(clearAllianceDefensePlan.data)}`)
    assert.equal(readObject(clearAllianceDefensePlan.data).ok, true)

    const batchAllianceDefenseProposal = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: 'subject_alpha',
      action: 'alliance_defense_batch_assign',
      args: {
        assignments: [{
          unitId: seeded.unitId,
          targetTileId: 'subject_resource_iron_l3',
          summary: 'Subject Alpha keeps the resource land guarded in batch mode.',
        }],
        summary: 'Subject Alpha batch defense memory.',
      },
      reason: '把批量同盟防守接入 AI 下一轮防守记忆。',
      source: 'rule',
    })
    assert.equal(
      batchAllianceDefenseProposal.status,
      200,
      `create batch alliance defense proposal failed: ${JSON.stringify(batchAllianceDefenseProposal.data)}`,
    )
    const batchAllianceDefenseProposalId = String(readObject(readObject(batchAllianceDefenseProposal.data).proposal).proposalId ?? '')
    assert.ok(batchAllianceDefenseProposalId.length > 0, 'subject fixture batch alliance defense proposal should return proposalId')

    const batchAllianceDefenseApproved = await requestJson(
      baseUrl,
      `/api/ai/players/proposals/${batchAllianceDefenseProposalId}/approve`,
      'POST',
      { approvedBy: 'human_alpha' },
    )
    assert.equal(
      batchAllianceDefenseApproved.status,
      200,
      `approve batch alliance defense proposal failed: ${JSON.stringify(batchAllianceDefenseApproved.data)}`,
    )

    const batchAllianceDefenseExecuted = await requestJson(
      baseUrl,
      `/api/ai/players/proposals/${batchAllianceDefenseProposalId}/execute`,
      'POST',
      {
        executedBy: 'human_alpha',
        includeWorld: false,
      },
      60_000,
    )
    assert.equal(
      batchAllianceDefenseExecuted.status,
      200,
      `execute batch alliance defense proposal failed: ${JSON.stringify(batchAllianceDefenseExecuted.data)}`,
    )
    const batchAllianceDefenseReceipt = readObject(readObject(batchAllianceDefenseExecuted.data).receipt)
    assert.equal(batchAllianceDefenseReceipt.ok, true)
    assert.equal(batchAllianceDefenseReceipt.action, 'alliance_defense_batch_assign')
    assert.equal(batchAllianceDefenseReceipt.worldAction, 'queuePlanExecution')

    const clearBeforeRogueAllianceDefense = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'clearPlanExecution',
      payload: { factionId: 'player' },
    }, 60_000)
    assert.equal(
      clearBeforeRogueAllianceDefense.status,
      200,
      `clear before rogue alliance defense failed: ${JSON.stringify(clearBeforeRogueAllianceDefense.data)}`,
    )
    assert.equal(readObject(clearBeforeRogueAllianceDefense.data).ok, true)

    const rogueAllianceDefenseProposal = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: 'subject_alpha',
      action: 'alliance_defense_assign',
      args: {
        unitId: seeded.rogueUnitId,
        targetTileId: 'subject_resource_iron_l3',
        summary: 'Subject Alpha must not command a rogue faction unit.',
      },
      reason: '验证执行入口失败也能进入下一轮治理记忆。',
      source: 'rule',
    })
    assert.equal(
      rogueAllianceDefenseProposal.status,
      200,
      `create rogue alliance defense proposal failed: ${JSON.stringify(rogueAllianceDefenseProposal.data)}`,
    )
    const rogueAllianceDefenseProposalId = String(readObject(readObject(rogueAllianceDefenseProposal.data).proposal).proposalId ?? '')
    assert.ok(rogueAllianceDefenseProposalId.length > 0, 'subject fixture rogue alliance defense proposal should return proposalId')

    const rogueAllianceDefenseApproved = await requestJson(
      baseUrl,
      `/api/ai/players/proposals/${rogueAllianceDefenseProposalId}/approve`,
      'POST',
      { approvedBy: 'human_alpha' },
    )
    assert.equal(
      rogueAllianceDefenseApproved.status,
      200,
      `approve rogue alliance defense proposal failed: ${JSON.stringify(rogueAllianceDefenseApproved.data)}`,
    )

    const rogueAllianceDefenseExecuted = await requestJson(
      baseUrl,
      `/api/ai/players/proposals/${rogueAllianceDefenseProposalId}/execute`,
      'POST',
      {
        executedBy: 'human_alpha',
        includeWorld: false,
      },
      60_000,
    )
    assert.equal(
      rogueAllianceDefenseExecuted.status,
      400,
      `rogue alliance defense execute must fail: ${JSON.stringify(rogueAllianceDefenseExecuted.data)}`,
    )
    const rogueAllianceDefenseFailure = readObject(rogueAllianceDefenseExecuted.data)
    assert.equal(rogueAllianceDefenseFailure.ok, false)
    assert.equal(rogueAllianceDefenseFailure.failureCode, 'proposal_execution_failed')
    assert.match(String(rogueAllianceDefenseFailure.error), /no alliance defense assignment target/)
    assert.equal(readObject(rogueAllianceDefenseFailure.proposal).status, 'failed')
    assert.equal(readObject(rogueAllianceDefenseFailure.proposal).failureCode, 'proposal_execution_failed')

    const rejectedAllianceDefenseProposal = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: 'subject_alpha',
      action: 'alliance_defense_assign',
      args: {
        unitId: seeded.unitId,
        targetTileId: 'subject_resource_iron_l3',
        summary: 'Subject Alpha rejected defense memory.',
      },
      reason: '验证被驳回的同盟防守也能进入下一轮治理记忆。',
      source: 'human',
    })
    assert.equal(
      rejectedAllianceDefenseProposal.status,
      200,
      `create rejected alliance defense proposal failed: ${JSON.stringify(rejectedAllianceDefenseProposal.data)}`,
    )
    const rejectedAllianceDefenseProposalId = String(readObject(readObject(rejectedAllianceDefenseProposal.data).proposal).proposalId ?? '')
    assert.ok(rejectedAllianceDefenseProposalId.length > 0, 'subject fixture rejected alliance defense proposal should return proposalId')

    const rejectedAllianceDefense = await requestJson(
      baseUrl,
      `/api/ai/players/proposals/${rejectedAllianceDefenseProposalId}/reject`,
      'POST',
      {
        rejectedBy: 'human_alpha',
        rejectionReason: 'player_declined_alliance_defense_assignment',
      },
      60_000,
    )
    assert.equal(
      rejectedAllianceDefense.status,
      200,
      `reject alliance defense proposal failed: ${JSON.stringify(rejectedAllianceDefense.data)}`,
    )
    const rejectedAllianceDefensePayload = readObject(rejectedAllianceDefense.data)
    assert.equal(rejectedAllianceDefensePayload.ok, true)
    assert.equal(readObject(rejectedAllianceDefensePayload.proposal).status, 'rejected')

    const saved = await requestJsonWithBearer(
      baseUrl,
      '/api/save-slots/save',
      'POST',
      sessionToken,
      {
        slotId: 'subject_restore_slot',
        label: 'Subject Restore Point',
      },
    )
    assert.equal(saved.status, 200, `save slot failed: ${JSON.stringify(saved.data)}`)

    const failedRestore = await requestJsonWithBearer(
      baseUrl,
      '/api/save-slots/load',
      'POST',
      sessionToken,
      {
        slotId: 'subject_missing_restore_slot',
      },
    )
    assert.equal(failedRestore.status, 200, `missing save-slot restore failed unexpectedly: ${JSON.stringify(failedRestore.data)}`)
    assert.equal(readObject(failedRestore.data).ok, false, 'missing save-slot restore should report action failure')

    const deniedReplayLookup = await requestJson(
      baseUrl,
      '/api/replay/subject_replay_guard_loss?factionId=player',
      'GET',
      undefined,
      60_000,
    )
    assert.equal(deniedReplayLookup.status, 401, `replay lookup without session should be denied: ${JSON.stringify(deniedReplayLookup.data)}`)
    assert.equal(readObject(deniedReplayLookup.data).deniedCopy, '这段回放未开放查看')

    const restored = await requestJsonWithBearer(
      baseUrl,
      '/api/save-slots/load',
      'POST',
      sessionToken,
      {
        slotId: 'subject_restore_slot',
      },
    )
    assert.equal(restored.status, 200, `save-slot restore failed unexpectedly: ${JSON.stringify(restored.data)}`)
    assert.equal(readObject(restored.data).ok, true, 'existing save-slot restore should report action success')

    const subjectResponse = await requestJson(
      baseUrl,
      '/api/ai/players/subject_alpha/subject?governorPlayerId=human_alpha&receiptLimit=20',
      'GET',
      undefined,
      60_000,
    )
    assert.equal(subjectResponse.status, 200, `subject read model failed: ${JSON.stringify(subjectResponse.data)}`)
    const subject = readObject(readObject(subjectResponse.data).subject)

    assert.equal(subject.schemaVersion, 'ai_player_subject_read_model_v1')
    assert.equal(subject.readOnly, true)
    const authorityBoundary = readObject(subject.authorityBoundary)
    assert.equal(authorityBoundary.contractId, 'client_server_ai_authority_boundary_v1')
    assert.equal(authorityBoundary.serverTruthOwner, 'server')
    assert.equal(authorityBoundary.aiReadEntrypoint, 'GET /api/ai/players/:id/subject')
    assert.equal(authorityBoundary.clientCachePolicy, 'read_through_cache_only')
    assert.equal(authorityBoundary.clientMutationAllowed, false)
    assert.equal(authorityBoundary.sourceRefsVisibility, 'internal_link_only')
    assert.equal(authorityBoundary.playerVisibleCopyPolicy, 'translate_before_player_ui')
    assert.equal(authorityBoundary.supportSurfacesAreAuthority, false)
    assert.deepEqual(readArray(authorityBoundary.ownerLabels), ['server-owned', 'AI-read'])

    const identity = readObject(subject.identity)
    assert.equal(identity.aiPlayerId, 'subject_alpha')
    assert.equal(identity.displayName, 'Subject Alpha')
    assert.equal(identity.governorPlayerId, 'human_alpha')
    assert.equal(identity.factionId, 'player')

    const homeCity = readObject(subject.homeCity)
    assert.equal(homeCity.bindingStatus, 'bound')
    assert.equal(homeCity.cityId, 'ai_home_city_subject_alpha')
    assert.equal(homeCity.centerTileId, selectedCandidate.centerTileId)
    assert.equal(homeCity.footprintId, 'ai_city_3x3_initial')
    assert.equal(homeCity.footprintSize, '3x3')
    assert.equal(readArray(homeCity.footprintTileIds).length, 9)

    const resources = readObject(subject.resources)
    assert.ok(readObject(resources.faction), 'subject resources must expose faction resource snapshot')
    assert.ok(readObject(resources.aiAccount), 'subject resources must expose AI resource account snapshot')
    assert.equal(readObject(resources.aiAccount).iron, 34, 'subject resources must reflect resource_gather into the AI subaccount')

    const subjectUnits = readArray(subject.units).map((item) => readObject(item))
    assert.ok(Array.isArray(subject.units), 'subject must expose an assigned unit array, even when empty')
    const subjectUnit = subjectUnits.find((item) => item.unitId === seeded.unitId)
    assert.ok(subjectUnit, 'subject must expose the AI assigned unit')
    assert.equal(subjectUnit.strength, 100)
    assert.equal(subjectUnit.supply, 100)
    assert.equal(subjectUnit.heroLevel, 18)
    assert.equal(subjectUnit.heroStarLevel, 2)
    assert.equal(subjectUnit.heroTroopType, 'infantry')
    assert.equal(subjectUnit.teamId, 'subject_team_01')
    assert.equal(subjectUnit.teamIndex, 1)
    const subjectCoHeroes = readArray(subjectUnit.coHeroes).map((item) => readObject(item))
    assert.equal(subjectCoHeroes.length, 1)
    assert.equal(subjectCoHeroes[0].heroId, 'subject_cohero_alpha')
    assert.equal(subjectCoHeroes[0].heroLevel, 12)
    assert.equal(subjectCoHeroes[0].heroStarLevel, 1)
    assert.equal(subjectCoHeroes[0].heroTroopType, 'archer')
    const formation = readObject(subjectUnit.formation)
    assert.equal(formation.teamId, 'subject_team_01')
    assert.equal(formation.teamIndex, 1)
    assert.equal(readArray(formation.slots).length, 2)
    assert.ok(Array.isArray(subject.landCandidates), 'subject must expose a land candidate array, even when empty')
    const economy = readObject(subject.economy)
    assert.deepEqual(readObject(economy.ownedResourceYieldPerTick), {
      food: 0,
      wood: 0,
      stone: 0,
      iron: 50,
    })
    const economyLimits = readObject(economy.limits)
    assert.equal(economyLimits.autoTickYieldToAiAccount, false)
    assert.equal(economyLimits.autoTickYieldPolicyReason, 'occupied_resource_yield_settles_to_faction_resources')
    assert.equal(economyLimits.aiSubaccountEarningAction, 'resource_gather')
    assert.equal(economyLimits.aiSubaccountEarningScope, 'one_time_gather_claim_not_automatic_tick_yield')
    const ownedResourceTiles = readArray(economy.ownedResourceTiles).map((item) => readObject(item))
    const ownedIron = ownedResourceTiles.find((item) => item.tileId === 'subject_resource_iron_l3')
    assert.ok(ownedIron, 'subject economy must include AI-owned resource tiles')
    assert.equal(ownedIron.resourceKind, 'iron')
    assert.equal(ownedIron.resourceLevel, 3)
    assert.equal(readObject(ownedIron.ongoingYield).yieldPerTick, 50)
    assert.equal(readObject(readObject(ownedIron.captureReward).amount).min, 600)
    assert.equal(readObject(ownedIron.captureReward).heroExp, 60)
    assert.equal(readObject(readObject(ownedIron.oneTimeGather).resources).iron, 30)
    assert.equal(readObject(ownedIron.oneTimeGather).gathered, true)
    assert.equal(readObject(ownedIron.oneTimeGather).claimId, 'ai_resource_gather_1_subject_alpha_subject_resource_iron_l3')
    const nextLand = readObject(subject.nextLand)
    assert.ok(
      nextLand.status === 'ready' || nextLand.status === 'unavailable',
      'subject must expose next land readiness instead of omitting the field',
    )
    if (readArray(subject.landCandidates).length > 0) {
      assert.equal(nextLand.status, 'ready')
      assert.ok(readObject(nextLand.candidate), 'ready next land must include the candidate')
    } else {
      assert.equal(nextLand.status, 'unavailable')
      assert.equal(nextLand.unavailableReason, 'no_current_land_candidate')
    }
    assert.ok(Array.isArray(subject.recommendedActions), 'subject must expose recommended action array, even when empty')
    assert.ok(Array.isArray(subject.recentReceipts), 'subject must expose recent receipt array, even when empty')
    const recentBodyChanges = readObject(subject.recentBodyChanges)
    assert.equal(recentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
    assert.equal(recentBodyChanges.aiPlayerId, 'subject_alpha')
    assert.equal(recentBodyChanges.factionId, 'player')
    assert.ok(Number(recentBodyChanges.count) >= 1, 'subject must expose recent body changes from executed receipts')
    const bodyChangeItems = readArray(recentBodyChanges.items).map((item) => readObject(item))
    const gatherBodyChange = bodyChangeItems.find((item) => item.action === 'resource_gather')
    assert.ok(gatherBodyChange, 'resource_gather receipt must become a subject body change')
    assert.equal(gatherBodyChange.bodyNode, 'resources_and_buildings')
    assert.equal(gatherBodyChange.status, 'completed')
    assert.equal(gatherBodyChange.targetTileId, 'subject_resource_iron_l3')
    assert.equal(gatherBodyChange.unitId, seeded.unitId)
    assert.equal(gatherBodyChange.claimId, 'ai_resource_gather_1_subject_alpha_subject_resource_iron_l3')
    assert.deepEqual(readObject(gatherBodyChange.resourceDelta), {
      food: 0,
      wood: 0,
      stone: 0,
      iron: 30,
    })
    assert.deepEqual(readObject(gatherBodyChange.accountBefore), {
      food: 1,
      wood: 2,
      stone: 3,
      iron: 4,
    })
    assert.deepEqual(readObject(gatherBodyChange.accountAfter), {
      food: 1,
      wood: 2,
      stone: 3,
      iron: 34,
    })
    assert.equal(gatherBodyChange.nextSubjectFocus, 'economy')
    assert.equal(gatherBodyChange.visibleToAi, true)
    assert.equal(gatherBodyChange.executionReceiptAvailable, true)
    assert.equal(gatherBodyChange.executionWorldAction, 'gatherAiResourceTile')
    assert.equal(typeof gatherBodyChange.executionActionRequestId, 'string')
    assert.equal(String(gatherBodyChange.executionActionRequestId).length > 0, true)
    assert.equal(gatherBodyChange.executionWorldReceiptAvailable, true)
    assert.equal(gatherBodyChange.executionWorldReceiptAction, 'gatherAiResourceTile')
    assert.equal(gatherBodyChange.executionWorldReceiptTargetTileId, 'subject_resource_iron_l3')
    const allianceDefenseBodyChange = bodyChangeItems.find((item) => item.proposalId === allianceDefenseProposalId)
    assert.ok(allianceDefenseBodyChange, 'alliance_defense_assign receipt must become a subject body change')
    assert.equal(allianceDefenseBodyChange.bodyNode, 'war_and_relations')
    assert.equal(allianceDefenseBodyChange.action, 'alliance_defense_assign')
    assert.equal(allianceDefenseBodyChange.status, 'completed')
    assert.equal(allianceDefenseBodyChange.unitId, seeded.unitId)
    assert.equal(allianceDefenseBodyChange.targetTileId, 'subject_resource_iron_l3')
    assert.equal(allianceDefenseBodyChange.assignmentCount, 1)
    assert.deepEqual(readArray(allianceDefenseBodyChange.assignmentUnitIds), [seeded.unitId])
    assert.deepEqual(readArray(allianceDefenseBodyChange.assignmentTargetTileIds), ['subject_resource_iron_l3'])
    assert.equal(allianceDefenseBodyChange.nextSubjectFocus, 'war')
    assert.equal(allianceDefenseBodyChange.visibleToAi, true)
    assert.equal(allianceDefenseBodyChange.executionReceiptAvailable, true)
    assert.equal(allianceDefenseBodyChange.executionWorldAction, 'queuePlanExecution')
    assert.equal(allianceDefenseBodyChange.governanceApprovedBeforeExecution, true)
    assert.equal(allianceDefenseBodyChange.governanceApprovedBy, 'human_alpha')
    const batchAllianceDefenseBodyChange = bodyChangeItems.find((item) => item.proposalId === batchAllianceDefenseProposalId)
    assert.ok(batchAllianceDefenseBodyChange, 'alliance_defense_batch_assign receipt must become a subject body change')
    assert.equal(batchAllianceDefenseBodyChange.bodyNode, 'war_and_relations')
    assert.equal(batchAllianceDefenseBodyChange.action, 'alliance_defense_batch_assign')
    assert.equal(batchAllianceDefenseBodyChange.status, 'completed')
    assert.equal(batchAllianceDefenseBodyChange.assignmentCount, 1)
    assert.deepEqual(readArray(batchAllianceDefenseBodyChange.assignmentUnitIds), [seeded.unitId])
    assert.deepEqual(readArray(batchAllianceDefenseBodyChange.assignmentTargetTileIds), ['subject_resource_iron_l3'])
    assert.equal(batchAllianceDefenseBodyChange.executionWorldAction, 'queuePlanExecution')
    const rejectedAllianceDefenseBodyChange = bodyChangeItems.find((item) => item.proposalId === rejectedAllianceDefenseProposalId)
    assert.ok(rejectedAllianceDefenseBodyChange, 'rejected alliance_defense_assign proposal must become a subject governance body change')
    assert.equal(rejectedAllianceDefenseBodyChange.bodyNode, 'human_command_and_obedience')
    assert.equal(rejectedAllianceDefenseBodyChange.action, 'alliance_defense_assign')
    assert.equal(rejectedAllianceDefenseBodyChange.status, 'failed')
    assert.equal(rejectedAllianceDefenseBodyChange.failureCode, 'player_declined_alliance_defense_assignment')
    assert.equal(rejectedAllianceDefenseBodyChange.rejectedBy, 'human_alpha')
    assert.equal(rejectedAllianceDefenseBodyChange.governanceRecoveryFocus, 'retry')
    assert.equal(rejectedAllianceDefenseBodyChange.governanceRecoverySummary, '提案已拒绝；需要重新用自然语言下令生成新提案。')
    assert.equal(rejectedAllianceDefenseBodyChange.nextSubjectFocus, 'governance')
    assert.equal(rejectedAllianceDefenseBodyChange.visibleToAi, true)
    const rogueAllianceDefenseBodyChange = bodyChangeItems.find((item) => item.proposalId === rogueAllianceDefenseProposalId)
    assert.ok(rogueAllianceDefenseBodyChange, 'rogue alliance_defense_assign execute failure must become a subject governance body change')
    assert.equal(rogueAllianceDefenseBodyChange.bodyNode, 'human_command_and_obedience')
    assert.equal(rogueAllianceDefenseBodyChange.action, 'alliance_defense_assign')
    assert.equal(rogueAllianceDefenseBodyChange.status, 'failed')
    assert.equal(rogueAllianceDefenseBodyChange.failureCode, 'proposal_execution_failed')
    assert.equal(rogueAllianceDefenseBodyChange.approvedBy, 'human_alpha')
    assert.equal(rogueAllianceDefenseBodyChange.governanceRecoveryFocus, 'retry')
    assert.equal(rogueAllianceDefenseBodyChange.governanceRecoverySummary, '查看回执失败原因，必要时重新下达更具体的自然语言命令。')
    assert.equal(rogueAllianceDefenseBodyChange.nextSubjectFocus, 'governance')
    assert.equal(rogueAllianceDefenseBodyChange.visibleToAi, true)
    const recentBattleResults = readObject(subject.recentBattleResults)
    assert.equal(recentBattleResults.aiPlayerId, 'subject_alpha')
    assert.equal(recentBattleResults.count, 2)
    const recentBattleItems = readArray(recentBattleResults.items).map((item) => readObject(item))
    const recentBattle = recentBattleItems.find((item) => item.reportId === 'subject_battle_guard_loss')
    assert.ok(recentBattle, 'subject recent battle results should include missing-replay battle')
    assert.equal(recentBattle.reportId, 'subject_battle_guard_loss')
    assert.equal(recentBattle.outcome, 'loss')
    assert.equal(recentBattle.assignedUnitInvolved, true)
    assert.equal(recentBattle.severity, 'high')
    assert.equal(typeof recentBattle.nextStepSuggestion, 'string')
    const expiredRecentBattle = recentBattleItems.find((item) => item.reportId === 'subject_battle_retention_expired')
    assert.ok(expiredRecentBattle, 'subject recent battle results should include retention-expired replay battle')
    assert.equal(expiredRecentBattle.replayRequestId, 'subject_replay_retention_expired')
    const recentHistoryAnchors = readObject(subject.recentHistoryAnchors)
    assert.equal(recentHistoryAnchors.contractId, 'ai_player_subject_history_anchors_v1')
    assert.equal(recentHistoryAnchors.aiPlayerId, 'subject_alpha')
    assert.ok(Number(recentHistoryAnchors.count) >= 1)
    const historyItems = readArray(recentHistoryAnchors.items).map((item) => readObject(item))
    const historyAnchor = historyItems.find((item) => item.title === 'AI 行动已完成')
    assert.ok(historyAnchor, 'subject history anchors should expose executed AI activity')
    assert.equal(historyAnchor.category, 'ai_activity')
    assert.equal(historyAnchor.title, 'AI 行动已完成')
    assert.equal(historyAnchor.resultLabel, '已执行')
    const historySourceRefs = readObject(historyAnchor.sourceRefs)
    assert.equal(historySourceRefs.visibility, 'internal_link_only')
    assert.equal(typeof historySourceRefs.worldEventId, 'string')
    assert.equal(String(historySourceRefs.worldEventId).length > 0, true)
    const gatherHistoryAnchor = historyItems.find((item) => item.proposalId === gatherProposalId)
    assert.ok(gatherHistoryAnchor, 'resource_gather history anchor should be recoverable by proposal id')
    assert.equal(gatherHistoryAnchor.bodyNode, 'resources_and_buildings')
    assert.equal(gatherHistoryAnchor.action, 'resource_gather')
    assert.deepEqual(readObject(gatherHistoryAnchor.resourceDelta), {
      food: 0,
      wood: 0,
      stone: 0,
      iron: 30,
    })
    assert.deepEqual(readObject(gatherHistoryAnchor.accountBefore), {
      food: 1,
      wood: 2,
      stone: 3,
      iron: 4,
    })
    assert.deepEqual(readObject(gatherHistoryAnchor.accountAfter), {
      food: 1,
      wood: 2,
      stone: 3,
      iron: 34,
    })
    const gatherHistorySourceRefs = readObject(gatherHistoryAnchor.sourceRefs)
    assert.equal(gatherBodyChange.historyAnchorAvailable, true)
    assert.equal(gatherBodyChange.historyAnchorWorldEventId, gatherHistorySourceRefs.worldEventId)
    assert.equal(gatherBodyChange.historyAnchorSourceVisibility, 'internal_link_only')
    const allianceDefenseHistoryAnchor = historyItems.find((item) => item.proposalId === allianceDefenseProposalId)
    assert.ok(allianceDefenseHistoryAnchor, 'alliance_defense_assign history anchor should be recoverable by proposal id')
    assert.equal(allianceDefenseHistoryAnchor.bodyNode, 'war_and_relations')
    assert.equal(allianceDefenseHistoryAnchor.action, 'alliance_defense_assign')
    assert.equal(allianceDefenseBodyChange.historyAnchorAvailable, true)
    assert.equal(allianceDefenseBodyChange.historyAnchorWorldEventId, readObject(allianceDefenseHistoryAnchor.sourceRefs).worldEventId)
    assert.equal(allianceDefenseBodyChange.historyAnchorSourceVisibility, 'internal_link_only')
    const rejectedAllianceDefenseHistoryAnchor = historyItems.find((item) => item.proposalId === rejectedAllianceDefenseProposalId)
    assert.ok(rejectedAllianceDefenseHistoryAnchor, 'rejected alliance_defense_assign history anchor should be recoverable by proposal id')
    assert.equal(rejectedAllianceDefenseHistoryAnchor.bodyNode, 'human_command_and_obedience')
    assert.equal(rejectedAllianceDefenseHistoryAnchor.action, 'alliance_defense_assign')
    assert.equal(rejectedAllianceDefenseHistoryAnchor.title, 'AI 行动受阻')
    assert.equal(rejectedAllianceDefenseHistoryAnchor.resultLabel, '已驳回')
    assert.equal(rejectedAllianceDefenseBodyChange.historyAnchorAvailable, true)
    assert.equal(
      rejectedAllianceDefenseBodyChange.historyAnchorWorldEventId,
      readObject(rejectedAllianceDefenseHistoryAnchor.sourceRefs).worldEventId,
    )
    assert.equal(rejectedAllianceDefenseBodyChange.historyAnchorSourceVisibility, 'internal_link_only')
    const rogueAllianceDefenseHistoryAnchor = historyItems.find((item) => item.proposalId === rogueAllianceDefenseProposalId)
    assert.ok(rogueAllianceDefenseHistoryAnchor, 'rogue alliance_defense_assign execute failure history anchor should be recoverable by proposal id')
    assert.equal(rogueAllianceDefenseHistoryAnchor.bodyNode, 'human_command_and_obedience')
    assert.equal(rogueAllianceDefenseHistoryAnchor.action, 'alliance_defense_assign')
    assert.equal(rogueAllianceDefenseHistoryAnchor.title, 'AI 行动受阻')
    assert.equal(rogueAllianceDefenseHistoryAnchor.resultLabel, '未完成')
    assert.equal(rogueAllianceDefenseBodyChange.historyAnchorAvailable, true)
    assert.equal(
      rogueAllianceDefenseBodyChange.historyAnchorWorldEventId,
      readObject(rogueAllianceDefenseHistoryAnchor.sourceRefs).worldEventId,
    )
    assert.equal(rogueAllianceDefenseBodyChange.historyAnchorSourceVisibility, 'internal_link_only')
    const recentRecoveryAnchors = readObject(subject.recentRecoveryAnchors)
    assert.equal(recentRecoveryAnchors.contractId, 'ai_player_subject_recovery_anchors_v1')
    assert.equal(recentRecoveryAnchors.aiPlayerId, 'subject_alpha')
    const recoveryItems = readArray(recentRecoveryAnchors.items).map((item) => readObject(item))
    const replayAnchor = recoveryItems.find((item) => {
      const refs = readObject(item.sourceRefs)
      return item.kind === 'replay' && refs.replayRequestId === 'subject_replay_guard_loss'
    })
    assert.ok(replayAnchor, 'subject recovery anchors should expose battle replay source')
    assert.equal(readObject(replayAnchor.sourceRefs).replayRequestId, 'subject_replay_guard_loss')
    assert.equal(readObject(replayAnchor.sourceRefs).replayAvailable, false)
    assert.equal(readObject(replayAnchor.sourceRefs).replayArchiveEntryAvailable, false)
    assert.equal(readObject(replayAnchor.sourceRefs).replayRetentionExpired, false)
    assert.equal(readObject(replayAnchor.sourceRefs).replayRecoveryReason, 'missing_replay_record')
    assert.equal(readObject(replayAnchor.sourceRefs).replayRecoverySurface, 'player_history_unavailable_replay')
    assert.equal(readObject(replayAnchor.sourceRefs).replaySupportHttpStatus, 404)
    assert.equal(readObject(replayAnchor.sourceRefs).replayPlayerSafeFallback, true)
    assert.equal(readObject(replayAnchor.sourceRefs).recommendedRecoveryCommand, 'open_player_history_replay_fallback')
    assert.equal(readObject(replayAnchor.sourceRefs).regionId, 'subject_region')
    const battleBodyChange = bodyChangeItems.find((item) => (
      item.bodyNode === 'war_and_relations' &&
      item.replayRequestId === 'subject_replay_guard_loss'
    ))
    assert.ok(battleBodyChange, 'subject body changes should expose the battle report body change with replay id')
    assert.equal(battleBodyChange.regionId, 'subject_region')
    assert.equal(battleBodyChange.recoveryAnchorReplayAvailable, false)
    assert.equal(battleBodyChange.recoveryAnchorReplayArchiveEntryAvailable, false)
    assert.equal(battleBodyChange.recoveryAnchorReplayRetentionExpired, false)
    assert.equal(battleBodyChange.recoveryAnchorReplayReason, 'missing_replay_record')
    assert.equal(battleBodyChange.recoveryAnchorReplayRecoverySurface, 'player_history_unavailable_replay')
    assert.equal(battleBodyChange.recoveryAnchorReplaySupportHttpStatus, 404)
    assert.equal(battleBodyChange.recoveryAnchorReplayPlayerSafeFallback, true)
    assert.equal(battleBodyChange.recoveryAnchorRecommendedRecoveryCommand, 'open_player_history_replay_fallback')
    assert.equal(battleBodyChange.warFollowUpAction, 'troop_heal')
    assert.equal(battleBodyChange.warFollowUpReadiness, 'ready')
    assert.equal(battleBodyChange.recommendedRecoveryCommand, 'continue_war_follow_up_action')
    const expiredReplayAnchor = recoveryItems.find((item) => {
      const refs = readObject(item.sourceRefs)
      return item.kind === 'replay' && refs.replayRequestId === 'subject_replay_retention_expired'
    })
    assert.ok(expiredReplayAnchor, 'subject recovery anchors should expose retention-expired replay source')
    const expiredReplayAnchorRefs = readObject(expiredReplayAnchor.sourceRefs)
    assert.equal(expiredReplayAnchorRefs.replayAvailable, false)
    assert.equal(expiredReplayAnchorRefs.replayArchiveEntryAvailable, true)
    assert.equal(expiredReplayAnchorRefs.replayRetentionExpired, true)
    assert.equal(expiredReplayAnchorRefs.replayRecoveryStatus, 'unavailable')
    assert.equal(expiredReplayAnchorRefs.replayRecoveryReason, 'retention_expired')
    assert.equal(expiredReplayAnchorRefs.replayRecoverySurface, 'replay_support_route_retention_unavailable')
    assert.equal(expiredReplayAnchorRefs.replaySupportHttpStatus, 410)
    assert.equal(expiredReplayAnchorRefs.replayPlayerSafeFallback, true)
    assert.equal(expiredReplayAnchorRefs.recommendedRecoveryCommand, 'return_to_battle_report_after_retention_expired')
    assert.equal(expiredReplayAnchorRefs.regionId, 'subject_region')
    const expiredBattleBodyChange = bodyChangeItems.find((item) => (
      item.bodyNode === 'war_and_relations' &&
      item.replayRequestId === 'subject_replay_retention_expired'
    ))
    assert.ok(expiredBattleBodyChange, 'subject body changes should expose retention-expired battle report body change')
    assert.equal(expiredBattleBodyChange.regionId, 'subject_region')
    assert.equal(expiredBattleBodyChange.recoveryAnchorReplayAvailable, false)
    assert.equal(expiredBattleBodyChange.recoveryAnchorReplayArchiveEntryAvailable, true)
    assert.equal(expiredBattleBodyChange.recoveryAnchorReplayRetentionExpired, true)
    assert.equal(expiredBattleBodyChange.recoveryAnchorReplayStatus, 'unavailable')
    assert.equal(expiredBattleBodyChange.recoveryAnchorReplayReason, 'retention_expired')
    assert.equal(expiredBattleBodyChange.recoveryAnchorReplayRecoverySurface, 'replay_support_route_retention_unavailable')
    assert.equal(expiredBattleBodyChange.recoveryAnchorReplaySupportHttpStatus, 410)
    assert.equal(expiredBattleBodyChange.recoveryAnchorReplayPlayerSafeFallback, true)
    assert.equal(expiredBattleBodyChange.recoveryAnchorRecommendedRecoveryCommand, 'return_to_battle_report_after_retention_expired')
    const saveAnchor = recoveryItems.find((item) => (
      item.kind === 'save' &&
      item.title === '存档已保存' &&
      readObject(item.sourceRefs).saveSlotId === 'subject_restore_slot'
    ))
    assert.ok(saveAnchor, 'subject recovery anchors should expose same-faction save source')
    const saveAnchorRefs = readObject(saveAnchor.sourceRefs)
    assert.equal(saveAnchorRefs.saveSlotId, 'subject_restore_slot')
    assert.equal(saveAnchorRefs.saveRecoveryStatus, 'saved')
    assert.equal(saveAnchorRefs.saveRecoveryTarget, 'Subject Restore Point')
    assert.equal(saveAnchorRefs.saveRecoveryScope, 'own_save_slot')
    assert.equal(saveAnchorRefs.saveRecoveryAction, 'save_slot')
    assert.equal(saveAnchorRefs.saveRecoverySuccess, true)
    assert.equal(saveAnchorRefs.saveRecoveryResultLabel, '可恢复')
    const restoredAnchor = recoveryItems.find((item) => (
      item.kind === 'save' &&
      item.title === '存档已恢复' &&
      readObject(item.sourceRefs).saveSlotId === 'subject_restore_slot'
    ))
    assert.ok(restoredAnchor, 'subject recovery anchors should expose successful restore source separately from save source')
    const restoredAnchorRefs = readObject(restoredAnchor.sourceRefs)
    assert.equal(restoredAnchorRefs.saveSlotId, 'subject_restore_slot')
    assert.equal(restoredAnchorRefs.saveRecoveryStatus, 'restored')
    assert.equal(restoredAnchorRefs.saveRecoveryTarget, 'Subject Restore Point')
    assert.equal(restoredAnchorRefs.saveRecoveryScope, 'own_save_slot')
    assert.equal(restoredAnchorRefs.saveRecoveryAction, 'load_slot')
    assert.equal(restoredAnchorRefs.saveRecoverySuccess, true)
    assert.equal(restoredAnchorRefs.saveRecoveryResultLabel, '已恢复')
    const failedRestoreAnchor = recoveryItems.find((item) => (
      item.kind === 'save' &&
      item.title === '存档恢复失败' &&
      readObject(item.sourceRefs).saveSlotId === 'subject_missing_restore_slot'
    ))
    assert.ok(failedRestoreAnchor, 'subject recovery anchors should expose failed save restore source')
    const failedRestoreAnchorRefs = readObject(failedRestoreAnchor.sourceRefs)
    assert.equal(failedRestoreAnchorRefs.visibility, 'internal_link_only')
    assert.equal(failedRestoreAnchorRefs.visible, false)
    assert.equal(failedRestoreAnchorRefs.saveRecoveryStatus, 'restore_failed')
    assert.equal(failedRestoreAnchorRefs.saveRecoveryTarget, '存档')
    assert.equal(failedRestoreAnchorRefs.saveRecoveryScope, 'own_save_slot')
    assert.equal(failedRestoreAnchorRefs.saveRecoveryAction, 'load_slot')
    assert.equal(failedRestoreAnchorRefs.saveRecoverySuccess, false)
    assert.equal(failedRestoreAnchorRefs.saveRecoveryResultLabel, '未找到存档')
    const saveBodyChange = bodyChangeItems.find((item) => (
      item.bodyNode === 'chat_report_history' &&
      item.action === 'save_slot' &&
      item.saveSlotId === 'subject_restore_slot' &&
      item.saveRecoveryStatus === 'saved'
    ))
    assert.ok(saveBodyChange, 'subject body changes should expose saved slot as next-cycle chat/report/history memory')
    assert.equal(saveBodyChange.status, 'completed')
    assert.equal(saveBodyChange.saveRecoveryTarget, 'Subject Restore Point')
    assert.equal(saveBodyChange.saveRecoveryScope, 'own_save_slot')
    assert.equal(saveBodyChange.saveRecoverySuccess, true)
    assert.equal(saveBodyChange.saveRecoveryResultLabel, '可恢复')
    assert.equal(saveBodyChange.recoveryAnchorAvailable, true)
    assert.equal(saveBodyChange.recoveryAnchorKind, 'save')
    assert.equal(saveBodyChange.recoveryAnchorSaveStatus, 'saved')
    assert.equal(saveBodyChange.recoveryAnchorSourceVisibility, 'internal_link_only')
    assert.equal(saveBodyChange.nextSubjectFocus, 'history')
    assert.equal(saveBodyChange.visibleToAi, true)
    const restoredBodyChange = bodyChangeItems.find((item) => (
      item.bodyNode === 'chat_report_history' &&
      item.action === 'load_slot' &&
      item.saveSlotId === 'subject_restore_slot' &&
      item.saveRecoveryStatus === 'restored'
    ))
    assert.ok(restoredBodyChange, 'subject body changes should expose restored slot as next-cycle chat/report/history memory')
    assert.equal(restoredBodyChange.status, 'completed')
    assert.equal(restoredBodyChange.saveRecoveryTarget, 'Subject Restore Point')
    assert.equal(restoredBodyChange.saveRecoverySuccess, true)
    assert.equal(restoredBodyChange.saveRecoveryResultLabel, '已恢复')
    assert.equal(restoredBodyChange.recoveryAnchorAvailable, true)
    assert.equal(restoredBodyChange.recoveryAnchorKind, 'save')
    assert.equal(restoredBodyChange.recoveryAnchorSaveStatus, 'restored')
    const failedRestoreBodyChange = bodyChangeItems.find((item) => (
      item.bodyNode === 'chat_report_history' &&
      item.action === 'load_slot' &&
      item.saveSlotId === 'subject_missing_restore_slot' &&
      item.saveRecoveryStatus === 'restore_failed'
    ))
    assert.ok(failedRestoreBodyChange, 'subject body changes should expose failed restore as next-cycle chat/report/history memory')
    assert.equal(failedRestoreBodyChange.status, 'failed')
    assert.equal(failedRestoreBodyChange.failureCode, 'restore_failed')
    assert.equal(failedRestoreBodyChange.saveRecoveryTarget, '存档')
    assert.equal(failedRestoreBodyChange.saveRecoverySuccess, false)
    assert.equal(failedRestoreBodyChange.saveRecoveryResultLabel, '未找到存档')
    assert.equal(failedRestoreBodyChange.recoveryAnchorAvailable, true)
    assert.equal(failedRestoreBodyChange.recoveryAnchorKind, 'save')
    assert.equal(failedRestoreBodyChange.recoveryAnchorSaveStatus, 'restore_failed')
    assert.equal(failedRestoreBodyChange.recommendedRecoveryCommand, 'open_save_slot_list')
    const replayDeniedBodyChange = bodyChangeItems.find((item) => (
      item.bodyNode === 'chat_report_history' &&
      item.action === 'replay_access_denied' &&
      item.replayRequestId === 'subject_replay_guard_loss'
    ))
    assert.ok(replayDeniedBodyChange, 'subject body changes should expose same-faction replay access denial as chat/report/history memory')
    assert.equal(replayDeniedBodyChange.status, 'failed')
    assert.equal(replayDeniedBodyChange.failureCode, 'replay_access_denied')
    assert.equal(replayDeniedBodyChange.replayAccessDenied, true)
    assert.equal(replayDeniedBodyChange.replayAccessDeniedReason, 'missing_session')
    assert.equal(replayDeniedBodyChange.replayAccessDeniedHttpStatus, 401)
    assert.equal(replayDeniedBodyChange.replayAccessDeniedSurface, 'replay_support_route_denied')
    assert.equal(replayDeniedBodyChange.replayAccessDeniedPlayerSafeFallback, true)
    assert.equal(replayDeniedBodyChange.recommendedRecoveryCommand, 'request_replay_access_or_return_battle_report')
    assert.equal(replayDeniedBodyChange.recoveryAnchorAvailable, true)
    assert.equal(replayDeniedBodyChange.recoveryAnchorKind, 'replay')
    assert.equal(replayDeniedBodyChange.recoveryAnchorReplayRequestId, 'subject_replay_guard_loss')
    assert.equal(replayDeniedBodyChange.nextSubjectFocus, 'history')
    assert.equal(replayDeniedBodyChange.visibleToAi, true)

    const autonomousObservationResponse = await requestJson(
      baseUrl,
      '/api/ai/players/subject_alpha/autonomous-development/observation?goalPower=4000',
      'GET',
      undefined,
      60_000,
    )
    assert.equal(
      autonomousObservationResponse.status,
      200,
      `autonomous observation failed: ${JSON.stringify(autonomousObservationResponse.data)}`,
    )
    const autonomousObservation = readObject(readObject(autonomousObservationResponse.data).observation)
    const subjectRecoveryCommands = readArray(autonomousObservation.subjectRecoveryCommands).map((item) => readObject(item))
    assert.ok(
      subjectRecoveryCommands.some((item) => (
        item.bodyNode === 'chat_report_history' &&
        item.recommendedRecoveryCommand === 'request_replay_access_or_return_battle_report' &&
        item.replayRequestId === 'subject_replay_guard_loss'
      )),
      'autonomous observation should consume subject replay denied recovery commands without parsing history prose',
    )
    assert.ok(
      subjectRecoveryCommands.some((item) => (
        item.recommendedRecoveryCommand === 'open_player_history_replay_fallback' &&
        item.replayRequestId === 'subject_replay_guard_loss' &&
        item.regionId === 'subject_region'
      )),
      'autonomous observation should consume missing replay fallback commands from subject recovery anchors',
    )
    assert.ok(
      subjectRecoveryCommands.some((item) => (
        item.recommendedRecoveryCommand === 'open_save_slot_list' &&
        item.saveSlotId === 'subject_missing_restore_slot'
      )),
      'autonomous observation should consume failed restore recovery commands from subject chat/report/history facts',
    )
    assert.ok(
      subjectRecoveryCommands.some((item) => (
        item.bodyNode === 'war_and_relations' &&
        item.recommendedRecoveryCommand === 'continue_war_follow_up_action' &&
        item.replayRequestId === 'subject_replay_guard_loss' &&
        item.regionId === 'subject_region'
      )),
      'autonomous observation should consume battle follow-up recovery commands from subject war body facts',
    )

    const source = readObject(subject.source)
    assert.equal(source.developmentPlanIncluded, true)
    assert.equal(source.mutationAllowed, false)

    const denied = await requestJson(
      baseUrl,
      '/api/ai/players/subject_alpha/subject?governorPlayerId=other_human',
      'GET',
      undefined,
      60_000,
    )
    assert.equal(denied.status, 403, `wrong governor must be rejected: ${JSON.stringify(denied.data)}`)
    assert.equal(readObject(denied.data).error, 'ai_player_subject_governor_mismatch')

    console.log('[ai_player_subject_read_model_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[ai_player_subject_read_model_contract] failed:', error)
  process.exitCode = 1
})
