import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  type AiPlayerHttpPersistPaths,
  AI_PLAYER_ID,
  FACTION_ID,
  GOVERNOR_PLAYER_ID,
  joinGovernor,
  startAiPlayerHttpBackend,
  type AiPlayerHttpBackend,
} from './helpers/aiPlayerHttpContractHarness'
import { buildSessionPersistPath, readArray, readObject, requestJson } from './helpers/backendHarness'

const AUTONOMOUS_ACTION_WHITELIST = [
  'march_move',
  'resource_gather',
  'tile_occupy',
  'troop_heal',
  'troop_train',
  'building_upgrade',
  'tactical_skill_upgrade',
  'queue_fill_idle_slot',
]

type SeededRecoveryMatrixWorld = {
  path: string
  unitId: string
  originTileId: string
  failedTargetTileId?: string
  recoveryTargetTileId?: string
  battleReportId?: string
}

function writeSeededWorld(name: string, world: ReturnType<typeof createInitialWorldState>) {
  const path = buildSessionPersistPath(name)
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return path
}

function assertPlayerLanguage(value: unknown, label: string) {
  assert.equal(typeof value, 'string', `${label} should be string`)
  const text = String(value)
  assert.ok(text.trim().length >= 6, `${label} should be non-empty player-facing language`)
  for (const forbidden of ['proposal', 'worldAction', 'MCP', 'tool', 'JSON', '后端 receipt']) {
    assert.equal(text.includes(forbidden), false, `${label} should not leak engineering wording: ${forbidden}`)
  }
}

function configureRuntimeFaction(
  world: ReturnType<typeof createInitialWorldState>,
  unitId: string,
  options: {
    actionPoints?: number
    food?: number
    wood?: number
    stone?: number
    iron?: number
    copper?: number
    developmentPoints?: number
  } = {},
) {
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding recovery matrix gate`)
  faction.actionPoints = options.actionPoints ?? 100
  faction.food = options.food ?? 100
  faction.wood = options.wood ?? 100
  faction.stone = options.stone ?? 100
  faction.iron = options.iron ?? 100
  faction.copper = options.copper ?? 2000
  faction.heroCommand.developmentPoints = options.developmentPoints ?? faction.heroCommand.developmentPoints
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: 'Player Operator Alpha',
      factionId: FACTION_ID,
      unitIds: [unitId],
      specialty: 'logistics',
    },
  ]
  faction.aiResourceAccounts = {
    [AI_PLAYER_ID]: {
      aiPlayerId: AI_PLAYER_ID,
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      resources: {
        food: 0,
        wood: 10,
        stone: 0,
        iron: 0,
        copper: 0,
      },
      updatedTick: world.tick,
    },
  }
  faction.aiResourceGatherClaims = {}
  return faction
}

function findTile(world: ReturnType<typeof createInitialWorldState>, tileId: string) {
  const tile = world.map.tiles.find((candidate) => candidate.id === tileId)
  assert.ok(tile, `missing tile while seeding recovery matrix gate: ${tileId}`)
  return tile
}

function stripCityFields(tile: ReturnType<typeof findTile>) {
  delete tile.cityLevel
  delete tile.cityDurability
  delete tile.cityDurabilityMax
  delete tile.cityDurabilityRole
  delete tile.landmarkId
  delete tile.landmarkName
}

function markGatheredFirstTile(
  world: ReturnType<typeof createInitialWorldState>,
  unitId: string,
  tileId: string,
) {
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while marking gathered tile`)
  faction.aiResourceGatherClaims = {
    ...(faction.aiResourceGatherClaims ?? {}),
    [tileId]: {
      id: `${tileId}_seeded_gather_claim`,
      aiPlayerId: AI_PLAYER_ID,
      unitId,
      tileId,
      factionId: FACTION_ID,
      resourceKind: 'wood',
      resourceLevel: 1,
      resources: {
        food: 0,
        wood: 10,
        stone: 0,
        iron: 0,
        copper: 0,
      },
      createdTick: world.tick,
    },
  }
}

function seedTargetInvalidSwitchWorld(): SeededRecoveryMatrixWorld {
  const world = createInitialWorldState()
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding target-invalid recovery`)
  const originTileId = 'tile_07'
  const failedTargetTileId = 'tile_08'
  const recoveryTargetTileId = 'tile_09'
  const origin = findTile(world, originTileId)
  const failedTarget = findTile(world, failedTargetTileId)
  const recoveryTarget = findTile(world, recoveryTargetTileId)

  Object.assign(origin, {
    name: 'AI Recovery Origin',
    type: 'resource',
    terrain: 'grassland',
    owner: FACTION_ID,
    enemyPressure: 0,
    scoutingDifficulty: 1,
    resourceKind: 'wood',
    resourceLevel: 1,
    moveCost: 1,
    district: 'ai_recovery_matrix',
  })
  Object.assign(failedTarget, {
    name: 'AI Recovery Invalid River Target',
    type: 'resource',
    terrain: 'riverland',
    owner: 'neutral',
    enemyPressure: 0,
    scoutingDifficulty: 1,
    resourceKind: 'stone',
    resourceLevel: 1,
    moveCost: 1,
    district: 'ai_recovery_matrix',
  })
  Object.assign(recoveryTarget, {
    name: 'AI Recovery Alternate Resource',
    type: 'resource',
    terrain: 'grassland',
    owner: 'neutral',
    enemyPressure: 0,
    scoutingDifficulty: 1,
    resourceKind: 'iron',
    resourceLevel: 1,
    moveCost: 1,
    district: 'ai_recovery_matrix',
  })
  stripCityFields(origin)
  stripCityFields(failedTarget)
  stripCityFields(recoveryTarget)
  world.map.connections[originTileId] = [failedTargetTileId, recoveryTargetTileId]
  world.map.connections[failedTargetTileId] = [originTileId]
  world.map.connections[recoveryTargetTileId] = [originTileId]

  unit.tileId = originTileId
  unit.status = '待命'
  unit.currentTask = undefined
  unit.strength = 100
  unit.mobility = 100
  unit.supply = 9
  unit.aiPlayerId = AI_PLAYER_ID

  configureRuntimeFaction(world, unit.id)
  markGatheredFirstTile(world, unit.id, originTileId)

  return {
    path: writeSeededWorld('ai_player_autonomous_development_recovery_matrix_target_invalid_world_state', world),
    unitId: unit.id,
    originTileId,
    failedTargetTileId,
    recoveryTargetTileId,
  }
}

function seedBattleLossTrainWorld(): SeededRecoveryMatrixWorld {
  const world = createInitialWorldState()
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding battle-loss training recovery`)
  const originTileId = 'tile_07'
  const origin = findTile(world, originTileId)
  Object.assign(origin, {
    name: 'AI Battle Loss Recovery Origin',
    type: 'resource',
    terrain: 'grassland',
    owner: FACTION_ID,
    enemyPressure: 0,
    scoutingDifficulty: 1,
    resourceKind: 'wood',
    resourceLevel: 1,
    moveCost: 1,
    district: 'ai_recovery_matrix_battle_loss',
  })
  stripCityFields(origin)
  world.map.connections[originTileId] = []

  unit.tileId = originTileId
  unit.status = '待命'
  unit.currentTask = undefined
  unit.strength = 100
  unit.mobility = 100
  unit.supply = 9
  unit.aiPlayerId = AI_PLAYER_ID

  const faction = configureRuntimeFaction(world, unit.id, {
    food: 100,
    wood: 0,
    stone: 0,
    iron: 0,
    copper: 0,
    developmentPoints: 0,
  })
  faction.heroCommand.commandLimit = Math.max(
    faction.heroCommand.commandLimit,
    world.units.filter((candidate) => candidate.faction === FACTION_ID).length + 1,
  )
  markGatheredFirstTile(world, unit.id, originTileId)

  const battleReportId = 'ai_recovery_matrix_battle_loss_latest'
  world.tick = 80
  world.feedback.battleRecords = [
    {
      id: battleReportId,
      tick: 79,
      regionId: 'ai_recovery_matrix_front',
      tileId: originTileId,
      attackerFaction: FACTION_ID,
      attackerUnitId: unit.id,
      outcome: 'loss',
      attackerLoss: 76,
      defenderLoss: 9,
      alliedSupport: 0,
      summary: 'AI recovery matrix fixture requires training a fresh unit after a high-loss report.',
    },
  ]

  return {
    path: writeSeededWorld('ai_player_autonomous_development_recovery_matrix_battle_loss_world_state', world),
    unitId: unit.id,
    originTileId,
    battleReportId,
  }
}

function seedResourceShortageQueueBusyWorld(): SeededRecoveryMatrixWorld {
  const world = createInitialWorldState()
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding resource-shortage safe skip`)
  const originTileId = 'tile_07'
  const origin = findTile(world, originTileId)
  const cityId = world.map.overlays.cityClusters.find((cluster) => cluster.owner === FACTION_ID)?.cityHallTileId ?? 'tile_15'
  const city = findTile(world, cityId)
  Object.assign(origin, {
    name: 'AI Safe Skip Gather Origin',
    type: 'resource',
    terrain: 'grassland',
    owner: FACTION_ID,
    enemyPressure: 0,
    scoutingDifficulty: 1,
    resourceKind: 'wood',
    resourceLevel: 1,
    moveCost: 1,
    district: 'ai_recovery_matrix_safe_skip',
  })
  stripCityFields(origin)
  Object.assign(city, {
    owner: FACTION_ID,
    type: 'city',
    terrain: 'grassland',
    cityLevel: Math.max(city.cityLevel ?? 1, 1),
  })
  world.map.connections[originTileId] = []

  unit.tileId = originTileId
  unit.status = '待命'
  unit.currentTask = undefined
  unit.strength = 100
  unit.mobility = 100
  unit.supply = 9
  unit.aiPlayerId = AI_PLAYER_ID

  configureRuntimeFaction(world, unit.id, {
    actionPoints: 0,
    food: 0,
    wood: 0,
    stone: 0,
    iron: 0,
    copper: 0,
    developmentPoints: 0,
  })
  world.slgDomainState ??= {}
  world.slgDomainState.affairsQueueByCity ??= {}
  world.slgDomainState.affairsQueueByCity[cityId] = [
    {
      id: 'queue_market_upgrade',
      statusText: '已入队',
      updatedTick: world.tick,
      description: 'market fixture queue entry',
    },
    {
      id: 'queue_tax_upgrade',
      statusText: '已入队',
      updatedTick: world.tick,
      description: 'tax fixture queue entry',
    },
    {
      id: 'queue_policy_review',
      statusText: '已入队',
      updatedTick: world.tick,
      description: 'policy fixture queue entry',
    },
  ]

  return {
    path: writeSeededWorld('ai_player_autonomous_development_recovery_matrix_safe_skip_world_state', world),
    unitId: unit.id,
    originTileId,
  }
}

async function bootAutonomousDevelopmentBackend(
  worldPersistPath: string,
  options: {
    persistPaths?: Partial<AiPlayerHttpPersistPaths>
    register?: boolean
  } = {},
): Promise<AiPlayerHttpBackend> {
  const backend = await startAiPlayerHttpBackend(
    'ai_player_autonomous_development_recovery_matrix_gate',
    options.persistPaths,
    {
      WORLD_STATE_PERSIST_PATH: worldPersistPath,
      ENABLE_FULL_MAP_LAYOUT: '1',
    },
  )
  await joinGovernor(backend.baseUrl)
  if (options.register === false) {
    return backend
  }
  const register = await requestJson(backend.baseUrl, '/api/ai/players', 'POST', {
    aiPlayerId: AI_PLAYER_ID,
    displayName: 'Player Operator Alpha',
    governorPlayerId: GOVERNOR_PLAYER_ID,
    factionId: FACTION_ID,
    actionWhitelist: AUTONOMOUS_ACTION_WHITELIST,
    runtimePolicy: {
      allowRuleProposals: true,
    },
  })
  assert.equal(register.status, 200, `register recovery matrix AI player failed: ${JSON.stringify(register.data)}`)
  return backend
}

async function runTargetInvalidSwitchCase() {
  const seeded = seedTargetInvalidSwitchWorld()
  const backend = await bootAutonomousDevelopmentBackend(seeded.path)
  try {
    const runResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/run`,
      'POST',
      {
        maxSteps: 3,
        goalPower: 4000,
        triggeredBy: 'autonomous_development_recovery_matrix_target_invalid',
      },
      90_000,
    )
    assert.equal(runResponse.status, 200, `target invalid run failed: ${JSON.stringify(runResponse.data)}`)
    const runPayload = readObject(readObject(runResponse.data).run)
    assert.equal(runPayload.stepCount, 3, 'target invalid recovery should continue after the failed executor receipt')
    const steps = readArray(runPayload.steps).map((item) => readObject(item))
    const failedStep = steps[0]
    assert.equal(failedStep.selectedAction, 'march_move')
    const failedReceipt = readObject(failedStep.receipt)
    assert.equal(failedReceipt.ok, false, 'first march should fail on the invalid target')
    assert.equal(readObject(failedReceipt.worldActionPayload).targetTileId, seeded.failedTargetTileId)
    assertPlayerLanguage(failedStep.naturalLanguageResult, 'target invalid failed naturalLanguageResult')

    const switchStep = steps[1]
    assert.equal(switchStep.selectedAction, 'march_move', 'second step should switch to the alternate target')
    const switchReceipt = readObject(switchStep.receipt)
    assert.equal(switchReceipt.ok, true, 'alternate march should succeed after filtering the failed target')
    assert.equal(readObject(switchReceipt.worldActionPayload).targetTileId, seeded.recoveryTargetTileId)
    const switchObservation = readObject(switchStep.observation)
    const failedReceipts = readArray(readObject(switchObservation.failureHistory).failedReceipts)
      .map((item) => readObject(item))
    assert.ok(
      failedReceipts.some((receipt) => receipt.proposalId === failedReceipt.proposalId),
      'second observation should carry failed receipt history into planner recovery',
    )

    const occupyStep = steps[2]
    assert.equal(occupyStep.selectedAction, 'tile_occupy', 'third step should occupy the switched target')
    assert.equal(readObject(occupyStep.receipt).ok, true)
    const personalReports = readArray(runPayload.personalReports).map((item) => readObject(item))
    assert.equal(personalReports.length, 3, 'target invalid recovery should write a personal report per step')
  } finally {
    await backend.stop()
  }
}

async function runBattleLossTrainCase() {
  const seeded = seedBattleLossTrainWorld()
  const backend = await bootAutonomousDevelopmentBackend(seeded.path)
  try {
    const observationResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/observation?goalPower=4000`,
      'GET',
    )
    assert.equal(observationResponse.status, 200, `battle loss observation failed: ${JSON.stringify(observationResponse.data)}`)
    const observation = readObject(readObject(observationResponse.data).observation)
    const battleReport = readArray(readObject(observation.battleReports).items).map((item) => readObject(item))[0]
    assert.equal(battleReport?.reportId, seeded.battleReportId)
    assert.equal(battleReport?.outcome, 'loss')
    assert.equal(battleReport?.assignedUnitInvolved, true)
    const troopTrainCandidate = readArray(observation.candidateActions).map((item) => readObject(item))
      .find((candidate) => candidate.action === 'troop_train')
    assert.equal(troopTrainCandidate?.readiness, 'ready', 'high-loss recovery should expose troop_train as executable')

    const runResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/run`,
      'POST',
      {
        maxSteps: 1,
        goalPower: 4000,
        triggeredBy: 'autonomous_development_recovery_matrix_battle_loss',
      },
      90_000,
    )
    assert.equal(runResponse.status, 200, `battle loss run failed: ${JSON.stringify(runResponse.data)}`)
    const runPayload = readObject(readObject(runResponse.data).run)
    assert.equal(runPayload.stepCount, 1)
    const step = readObject(readArray(runPayload.steps)[0])
    assert.equal(step.selectedAction, 'troop_train', 'battle loss without a damaged current unit should train a new unit')
    const receipt = readObject(step.receipt)
    assert.equal(receipt.ok, true, `troop_train receipt should succeed: ${JSON.stringify(receipt)}`)
    assert.equal(receipt.worldAction, 'deployReserveHero')
    assertPlayerLanguage(step.naturalLanguageResult, 'battle loss train naturalLanguageResult')
  } finally {
    await backend.stop()
  }
}

async function runResourceQueueSafeSkipCase() {
  const seeded = seedResourceShortageQueueBusyWorld()
  const backend = await bootAutonomousDevelopmentBackend(seeded.path)
  try {
    const observationResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/observation?goalPower=4000`,
      'GET',
    )
    assert.equal(observationResponse.status, 200, `safe skip observation failed: ${JSON.stringify(observationResponse.data)}`)
    const observation = readObject(readObject(observationResponse.data).observation)
    const queueCandidate = readArray(observation.candidateActions).map((item) => readObject(item))
      .find((candidate) => candidate.action === 'queue_fill_idle_slot')
    assert.equal(queueCandidate?.readiness, 'blocked', 'all busy city queues should block queue_fill_idle_slot')
    assert.ok(readArray(queueCandidate.blockers).includes('queue_busy'), 'queue candidate should expose queue_busy blocker')

    const runResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/run`,
      'POST',
      {
        maxSteps: 2,
        goalPower: 4000,
        triggeredBy: 'autonomous_development_recovery_matrix_safe_skip',
      },
      90_000,
    )
    assert.equal(runResponse.status, 200, `safe skip run failed: ${JSON.stringify(runResponse.data)}`)
    const runPayload = readObject(readObject(runResponse.data).run)
    assert.equal(runPayload.stepCount, 2, 'safe skip case should gather once and then write a safe skip step')
    const steps = readArray(runPayload.steps).map((item) => readObject(item))
    assert.equal(steps[0].selectedAction, 'resource_gather')
    assert.equal(readObject(steps[0].receipt).ok, true)
    assert.equal(steps[1].selectedAction, 'next_step_propose', 'no safe executable move should become a safe skip')
    const safeSkipReceipt = readObject(steps[1].receipt)
    assert.equal(safeSkipReceipt.ok, true)
    assert.equal(safeSkipReceipt.worldAction, null)
    assert.equal(readObject(safeSkipReceipt.execution).kind, 'autonomous_safe_skip')
    assertPlayerLanguage(steps[1].naturalLanguageResult, 'safe skip naturalLanguageResult')
    const personalReports = readArray(runPayload.personalReports).map((item) => readObject(item))
    assert.equal(personalReports.length, 2, 'safe skip should still write a personal report')
    assert.equal(personalReports[1].action, 'next_step_propose')
    assertPlayerLanguage(personalReports[1].summary, 'safe skip personal report summary')
  } finally {
    await backend.stop()
  }
}

async function run() {
  await runTargetInvalidSwitchCase()
  await runBattleLossTrainCase()
  await runResourceQueueSafeSkipCase()
  console.log('ai_player_autonomous_development_recovery_matrix_gate passed')
}

run().catch((error) => {
  console.error('ai_player_autonomous_development_recovery_matrix_gate failed')
  console.error(error)
  process.exitCode = 1
})
