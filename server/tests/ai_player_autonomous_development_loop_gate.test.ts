import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  type AiPlayerHttpPersistPaths,
  AI_PLAYER_ID,
  FACTION_ID,
  GOVERNOR_PLAYER_ID,
  joinGovernor,
  loadWorldState,
  startAiPlayerHttpBackend,
  type AiPlayerHttpBackend,
} from './helpers/aiPlayerHttpContractHarness'
import { buildSessionPersistPath, readArray, readObject, requestJson, sleep } from './helpers/backendHarness'

type SeededAutonomousDevelopmentWorld = {
  path: string
  unitId: string
  firstTileId: string
  secondTileId: string
  chainTileIds?: string[]
  recoveryBattleReportId?: string
}

const AUTONOMOUS_ACTION_WHITELIST = [
  'march_move',
  'resource_gather',
  'tile_occupy',
  'troop_heal',
  'troop_train',
  'building_upgrade',
  'tactical_skill_upgrade',
]

function readRequestedMaxSteps() {
  const inline = process.argv.find((arg) => arg.startsWith('--max-steps='))
  if (inline) {
    const value = Number(inline.slice('--max-steps='.length))
    return Number.isFinite(value) ? Math.trunc(value) : 5
  }
  const separateIndex = process.argv.indexOf('--max-steps')
  if (separateIndex >= 0) {
    const value = Number(process.argv[separateIndex + 1])
    return Number.isFinite(value) ? Math.trunc(value) : 5
  }
  return 5
}

function pickConnectedDevelopmentTiles(): SeededAutonomousDevelopmentWorld {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding autonomous development gate`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding autonomous development gate`)

  let firstTile = world.map.tiles.find((tile) => tile.id === unit.tileId) ?? world.map.tiles[0]
  assert.ok(firstTile, 'missing first tile while seeding autonomous development gate')
  let secondTileId = (world.map.connections[firstTile.id] ?? [])[0]
  if (!secondTileId) {
    const fallbackTile = world.map.tiles.find((tile) => tile.id !== firstTile.id)
    assert.ok(fallbackTile, 'missing second tile while seeding autonomous development gate')
    secondTileId = fallbackTile.id
    world.map.connections[firstTile.id] = [secondTileId]
    world.map.connections[secondTileId] = Array.from(new Set([...(world.map.connections[secondTileId] ?? []), firstTile.id]))
  }
  let secondTile = world.map.tiles.find((tile) => tile.id === secondTileId)
  assert.ok(secondTile, 'missing connected second tile while seeding autonomous development gate')

  firstTile = {
    ...firstTile,
    name: 'AI Autonomous Gate First Resource',
    type: 'resource',
    owner: 'neutral',
    enemyPressure: 0,
    resourceKind: 'wood',
    resourceLevel: 1,
  }
  secondTile = {
    ...secondTile,
    name: 'AI Autonomous Gate Second Resource',
    type: 'resource',
    owner: 'neutral',
    enemyPressure: 0,
    resourceKind: 'stone',
    resourceLevel: 2,
  }
  world.map.tiles = world.map.tiles.map((tile) => {
    if (tile.id === firstTile.id) {
      return firstTile
    }
    if (tile.id === secondTile.id) {
      return secondTile
    }
    return tile
  })

  unit.tileId = firstTile.id
  unit.status = '待命'
  unit.currentTask = undefined
  unit.strength = Math.max(unit.strength, 100)
  unit.mobility = Math.max(unit.mobility, 100)
  unit.supply = Math.max(unit.supply, 100)

  faction.actionPoints = 100
  faction.food = 100
  faction.wood = Math.max(faction.wood ?? 0, 100)
  faction.stone = Math.max(faction.stone ?? 0, 100)
  faction.iron = Math.max(faction.iron ?? 0, 100)
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: 'Player Operator Alpha',
      factionId: FACTION_ID,
      unitIds: [unit.id],
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
        wood: 0,
        stone: 0,
        iron: 0,
      },
      updatedTick: world.tick,
    },
  }
  faction.aiResourceGatherClaims = {}

  const path = buildSessionPersistPath('ai_player_autonomous_development_loop_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    path,
    unitId: unit.id,
    firstTileId: firstTile.id,
    secondTileId: secondTile.id,
  }
}

function pickRecoveryDevelopmentChainTiles(): SeededAutonomousDevelopmentWorld {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding autonomous development recovery gate`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding autonomous development recovery gate`)

  const chainTileIds = ['tile_07', 'tile_08', 'tile_09', 'tile_10', 'tile_11', 'tile_12', 'tile_13', 'tile_14']
  const resourceKinds = ['wood', 'stone', 'iron', 'food', 'copper', 'wood', 'stone', 'iron'] as const
  const tileById = new Map(world.map.tiles.map((tile) => [tile.id, tile] as const))
  for (const tileId of chainTileIds) {
    assert.ok(tileById.has(tileId), `missing chain tile while seeding recovery gate: ${tileId}`)
  }

  for (let index = 0; index < chainTileIds.length; index += 1) {
    const tileId = chainTileIds[index]
    const tile = tileById.get(tileId)
    assert.ok(tile, `missing chain tile ${tileId}`)
    tile.name = `AI Autonomous Recovery Chain ${index + 1}`
    tile.type = 'resource'
    tile.terrain = 'grassland'
    tile.owner = index === 0 ? FACTION_ID : 'neutral'
    tile.enemyPressure = 0
    tile.scoutingDifficulty = 1
    tile.resourceKind = resourceKinds[index]
    tile.resourceLevel = 1
    tile.moveCost = 1
    tile.district = 'ai_autonomous_recovery_gate'
    delete tile.cityLevel
    delete tile.cityDurability
    delete tile.cityDurabilityMax
    delete tile.cityDurabilityRole
    delete tile.landmarkId
    delete tile.landmarkName
    world.map.connections[tileId] = [
      chainTileIds[index - 1],
      chainTileIds[index + 1],
    ].filter((candidate): candidate is string => Boolean(candidate))
  }

  unit.tileId = chainTileIds[0]
  unit.status = '待命'
  unit.currentTask = undefined
  unit.strength = 68
  unit.mobility = Math.max(unit.mobility, 100)
  unit.supply = 7
  unit.aiPlayerId = AI_PLAYER_ID

  faction.actionPoints = 100
  faction.food = 100
  faction.wood = Math.max(faction.wood ?? 0, 100)
  faction.stone = Math.max(faction.stone ?? 0, 100)
  faction.iron = Math.max(faction.iron ?? 0, 100)
  faction.copper = Math.max(faction.copper ?? 0, 2000)
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: 'Player Operator Alpha',
      factionId: FACTION_ID,
      unitIds: [unit.id],
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
  faction.aiResourceGatherClaims = {
    [chainTileIds[0]]: {
      id: 'ai_autonomous_recovery_seeded_first_tile_claim',
      aiPlayerId: AI_PLAYER_ID,
      unitId: unit.id,
      tileId: chainTileIds[0],
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

  const recoveryBattleReportId = 'ai_autonomous_recovery_loss_latest'
  world.tick = 44
  world.feedback.battleRecords = [
    {
      id: recoveryBattleReportId,
      tick: 43,
      regionId: 'ai_autonomous_recovery_front',
      tileId: chainTileIds[0],
      attackerFaction: FACTION_ID,
      attackerUnitId: unit.id,
      outcome: 'loss',
      attackerLoss: 62,
      defenderLoss: 18,
      alliedSupport: 0,
      summary: 'AI autonomous recovery fixture starts from a recent loss and damaged assigned unit.',
    },
  ]

  const path = buildSessionPersistPath('ai_player_autonomous_development_loop_20_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    path,
    unitId: unit.id,
    firstTileId: chainTileIds[0],
    secondTileId: chainTileIds[1],
    chainTileIds,
    recoveryBattleReportId,
  }
}

function pickBlockedMarchFailureTiles(): SeededAutonomousDevelopmentWorld {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding autonomous development failed receipt gate`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding autonomous development failed receipt gate`)

  const firstTileId = 'tile_07'
  const secondTileId = 'tile_08'
  const firstTile = world.map.tiles.find((tile) => tile.id === firstTileId)
  const secondTile = world.map.tiles.find((tile) => tile.id === secondTileId)
  assert.ok(firstTile, `missing blocked failure first tile: ${firstTileId}`)
  assert.ok(secondTile, `missing blocked failure second tile: ${secondTileId}`)

  firstTile.name = 'AI Autonomous Failure Origin'
  firstTile.type = 'resource'
  firstTile.terrain = 'grassland'
  firstTile.owner = FACTION_ID
  firstTile.enemyPressure = 0
  firstTile.scoutingDifficulty = 1
  firstTile.resourceKind = 'wood'
  firstTile.resourceLevel = 1
  firstTile.moveCost = 1
  firstTile.district = 'ai_autonomous_failed_receipt_gate'
  delete firstTile.cityLevel
  delete firstTile.cityDurability
  delete firstTile.cityDurabilityMax
  delete firstTile.cityDurabilityRole
  delete firstTile.landmarkId
  delete firstTile.landmarkName

  secondTile.name = 'AI Autonomous Blocked River Target'
  secondTile.type = 'resource'
  secondTile.terrain = 'riverland'
  secondTile.owner = 'neutral'
  secondTile.enemyPressure = 0
  secondTile.scoutingDifficulty = 1
  secondTile.resourceKind = 'stone'
  secondTile.resourceLevel = 1
  secondTile.moveCost = 1
  secondTile.district = 'ai_autonomous_failed_receipt_gate'
  delete secondTile.cityLevel
  delete secondTile.cityDurability
  delete secondTile.cityDurabilityMax
  delete secondTile.cityDurabilityRole
  delete secondTile.landmarkId
  delete secondTile.landmarkName
  world.map.connections[firstTileId] = [secondTileId]
  world.map.connections[secondTileId] = [firstTileId]

  unit.tileId = firstTileId
  unit.status = '待命'
  unit.currentTask = undefined
  unit.strength = 100
  unit.mobility = Math.max(unit.mobility, 100)
  unit.supply = 9
  unit.aiPlayerId = AI_PLAYER_ID

  faction.actionPoints = 100
  faction.food = 100
  faction.wood = Math.max(faction.wood ?? 0, 100)
  faction.stone = Math.max(faction.stone ?? 0, 100)
  faction.iron = Math.max(faction.iron ?? 0, 100)
  faction.copper = Math.max(faction.copper ?? 0, 2000)
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: 'Player Operator Alpha',
      factionId: FACTION_ID,
      unitIds: [unit.id],
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
  faction.aiResourceGatherClaims = {
    [firstTileId]: {
      id: 'ai_autonomous_failed_receipt_seeded_first_tile_claim',
      aiPlayerId: AI_PLAYER_ID,
      unitId: unit.id,
      tileId: firstTileId,
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

  const path = buildSessionPersistPath('ai_player_autonomous_development_failed_receipt_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    path,
    unitId: unit.id,
    firstTileId,
    secondTileId,
  }
}

async function bootAutonomousDevelopmentBackend(
  worldPersistPath: string,
  options: {
    persistPaths?: Partial<AiPlayerHttpPersistPaths>
    register?: boolean
    envOverrides?: NodeJS.ProcessEnv
  } = {},
): Promise<AiPlayerHttpBackend> {
  const backend = await startAiPlayerHttpBackend(
    'ai_player_autonomous_development_loop_gate',
    options.persistPaths,
    {
      WORLD_STATE_PERSIST_PATH: worldPersistPath,
      ENABLE_FULL_MAP_LAYOUT: '1',
      ...options.envOverrides,
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
  assert.equal(register.status, 200, `register autonomous development AI player failed: ${JSON.stringify(register.data)}`)
  return backend
}

function assertPlayerLanguage(value: unknown, label: string) {
  assert.equal(typeof value, 'string', `${label} should be string`)
  const text = String(value)
  assert.ok(text.trim().length >= 6, `${label} should be non-empty player-facing language`)
  for (const forbidden of ['proposal', 'worldAction', 'MCP', 'tool', 'JSON', '后端 receipt']) {
    assert.equal(text.includes(forbidden), false, `${label} should not leak engineering wording: ${forbidden}`)
  }
}

async function runTwentyStepRecoveryGate() {
  const seeded = pickRecoveryDevelopmentChainTiles()
  const chainTileIds = seeded.chainTileIds ?? []
  assert.equal(chainTileIds.length, 8, '20-step recovery fixture should expose an eight-tile chain')
  const backend = await bootAutonomousDevelopmentBackend(seeded.path)
  try {
    const observationBefore = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/observation?goalPower=4000`,
      'GET',
    )
    assert.equal(observationBefore.status, 200, `20-step observation route failed: ${JSON.stringify(observationBefore.data)}`)
    const observation = readObject(readObject(observationBefore.data).observation)
    const battleReports = readArray(readObject(observation.battleReports).items).map((item) => readObject(item))
    assert.equal(battleReports[0]?.reportId, seeded.recoveryBattleReportId, 'recovery fixture should surface the latest AI battle report')
    assert.equal(battleReports[0]?.outcome, 'loss', 'recovery fixture should start from a loss report')
    assert.equal(battleReports[0]?.severity, 'high', 'loss report should be high severity')
    assert.equal(battleReports[0]?.assignedUnitInvolved, true, 'loss report should involve the assigned AI unit')
    const observedUnit = readArray(observation.units).map((item) => readObject(item)).find((unit) => unit.id === seeded.unitId)
    assert.equal(observedUnit?.strength, 68, 'recovery fixture should start with a damaged assigned unit')
    const healCandidate = readArray(observation.candidateActions).map((item) => readObject(item)).find((candidate) => candidate.action === 'troop_heal')
    assert.equal(healCandidate?.readiness, 'ready', 'damaged assigned unit should make troop_heal ready')

    const runResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/run`,
      'POST',
      {
        maxSteps: 20,
        goalPower: 4000,
        triggeredBy: 'autonomous_development_fixture_gate_20',
      },
      180_000,
    )
    assert.equal(runResponse.status, 200, `20-step autonomous development run failed: ${JSON.stringify(runResponse.data)}`)
    const payload = readObject(runResponse.data)
    assert.equal(payload.ok, true)
    const runPayload = readObject(payload.run)
    assert.equal(runPayload.aiPlayerId, AI_PLAYER_ID)
    assert.equal(runPayload.requestedMaxSteps, 20)
    assert.equal(runPayload.stepCount, 20)
    const steps = readArray(runPayload.steps).map((item) => readObject(item))
    const selectedActions = steps.map((step) => String(step.selectedAction))
    const healCount = selectedActions.filter((action) => action === 'troop_heal').length
    const marchCount = selectedActions.filter((action) => action === 'march_move').length
    const occupyCount = selectedActions.filter((action) => action === 'tile_occupy').length
    const gatherCount = selectedActions.filter((action) => action === 'resource_gather').length
    assert.equal(selectedActions[0], 'troop_heal', '20-step fixture should start by recovering from the seeded loss')
    assert.ok(healCount >= 1, '20-step fixture should recover damaged or low-supply units before overextending')
    assert.ok(marchCount >= 4, '20-step fixture should keep marching along the development chain')
    assert.ok(occupyCount >= 4, '20-step fixture should keep occupying resource targets')
    assert.ok(gatherCount >= 4, '20-step fixture should keep gathering occupied resource targets')

    for (const step of steps) {
      assert.ok(readObject(step.observation), 'each 20-step entry should keep the backend observation snapshot')
      assert.ok(readObject(step.plannerDecision), 'each 20-step entry should keep the backend planner decision')
      assert.equal(readObject(step.receipt).ok, true, 'each 20-step executor receipt should succeed')
      assertPlayerLanguage(step.naturalLanguageResult, '20-step naturalLanguageResult')
    }
    const secondStepUnit = readArray(readObject(steps[1].observation).units)
      .map((item) => readObject(item))
      .find((unit) => unit.id === seeded.unitId)
    assert.equal(secondStepUnit?.strength, 88, 'second step observation should see healed strength before moving')
    assert.equal(secondStepUnit?.supply, 9, 'second step observation should see restored supply before moving')

    const personalReports = readArray(runPayload.personalReports).map((item) => readObject(item))
    assert.equal(personalReports.length, 20, '20-step autonomous run should write one personal report per executed step')
    for (const report of personalReports) {
      assert.equal(report.ownerPlayerId, GOVERNOR_PLAYER_ID)
      assert.equal(report.actorType, 'ai_player')
      assert.equal(report.aiPlayerId, AI_PLAYER_ID)
      assert.equal(report.factionId, FACTION_ID)
      assertPlayerLanguage(report.summary, '20-step personal report summary')
      assertPlayerLanguage(report.result, '20-step personal report result')
    }

    const reportsResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/personal-reports?limit=20`,
      'GET',
    )
    assert.equal(reportsResponse.status, 200, `20-step personal reports route failed: ${JSON.stringify(reportsResponse.data)}`)
    assert.equal(readArray(readObject(reportsResponse.data).items).length, 20)

    const playerReportsResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/player-reports?limit=40`,
      'GET',
    )
    assert.equal(playerReportsResponse.status, 200, `20-step player reports route failed: ${JSON.stringify(playerReportsResponse.data)}`)
    const playerReports = readArray(readObject(playerReportsResponse.data).items).map((item) => readObject(item))
    assert.ok(playerReports.filter((report) => report.itemKind === 'ai_autonomous_development').length >= 20, 'player report list should include all 20 autonomous reports')
    assert.ok(playerReports.some((report) => report.itemKind === 'battle_report'), 'player report list should include battle report context after the autonomous run')

    const worldAfter = await loadWorldState(backend.baseUrl)
    const factionAfter = worldAfter.factions[FACTION_ID]
    assert.ok(factionAfter, 'faction should exist after 20-step autonomous development run')
    const unitAfter = worldAfter.units.find((unit) => unit.id === seeded.unitId)
    assert.equal(
      unitAfter?.tileId,
      chainTileIds[Math.min(chainTileIds.length - 1, marchCount)],
      '20-step run should end at the chain index reached by successful march steps',
    )
    const tileStates = (worldAfter.map as unknown as { tileStates?: Array<{ id: string; owner?: string }> }).tileStates ?? []
    const tileOwner = (tileId: string) => tileStates.find((tile) => tile.id === tileId)?.owner
      ?? worldAfter.map.tiles.find((tile) => tile.id === tileId)?.owner
    for (const occupiedTileId of chainTileIds.slice(0, 1 + occupyCount)) {
      assert.equal(tileOwner(occupiedTileId), FACTION_ID, `chain tile should be owned after recovery run: ${occupiedTileId}`)
    }
    const claims = factionAfter.aiResourceGatherClaims ?? {}
    for (const gatheredTileId of chainTileIds.slice(0, 1 + gatherCount)) {
      assert.ok(claims[gatheredTileId], `gather claim should exist after recovery run: ${gatheredTileId}`)
    }
  } finally {
    await backend.stop()
  }
}

async function runFailedReceiptRecoveryGate() {
  const seeded = pickBlockedMarchFailureTiles()
  const backend = await bootAutonomousDevelopmentBackend(seeded.path)
  try {
    const runResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/run`,
      'POST',
      {
        maxSteps: 3,
        goalPower: 4000,
        triggeredBy: 'autonomous_development_failed_receipt_gate',
      },
      90_000,
    )
    assert.equal(runResponse.status, 200, `failed receipt autonomous run failed: ${JSON.stringify(runResponse.data)}`)
    const payload = readObject(runResponse.data)
    assert.equal(payload.ok, true)
    const runPayload = readObject(payload.run)
    assert.equal(runPayload.requestedMaxSteps, 3)
    assert.equal(runPayload.stepCount, 3, 'autonomous loop should continue after a failed executor receipt and recover safely')
    const steps = readArray(runPayload.steps).map((item) => readObject(item))
    const failedStep = steps[0]
    assert.equal(failedStep.selectedAction, 'march_move')
    const failedReceipt = readObject(failedStep.receipt)
    assert.equal(failedReceipt.ok, false, 'blocked march should produce a failed backend receipt')
    assert.match(String(failedReceipt.message), /河流阻隔|关口|渡口/, 'failed receipt should keep the concrete world authority reason')
    assertPlayerLanguage(failedStep.naturalLanguageResult, 'failed receipt naturalLanguageResult')
    const personalReports = readArray(runPayload.personalReports).map((item) => readObject(item))
    assert.equal(personalReports.length, 3, 'failed receipt recovery should write one personal report per step')
    assert.equal(personalReports[0].relatedReceiptProposalId, failedReceipt.proposalId)
    assertPlayerLanguage(personalReports[0].summary, 'failed receipt personal report summary')
    assertPlayerLanguage(personalReports[0].result, 'failed receipt personal report result')
    const secondStepObservation = readObject(steps[1].observation)
    const secondStepFailedReceipts = readArray(readObject(secondStepObservation.failureHistory).failedReceipts)
      .map((item) => readObject(item))
    assert.ok(
      secondStepFailedReceipts.some((receipt) => receipt.proposalId === failedReceipt.proposalId && receipt.action === 'march_move'),
      'second step observation should expose the failed executor receipt for recovery planning',
    )
    const repeatedFailedTarget = steps.slice(1).find((step) => {
      const receipt = readObject(step.receipt)
      const payload = receipt.worldActionPayload
      if (!payload || typeof payload !== 'object') {
        return false
      }
      return receipt.action === 'march_move' && readObject(payload).targetTileId === seeded.secondTileId
    })
    assert.equal(repeatedFailedTarget, undefined, 'recovery planner should not retry the same failed march target inside the run')

    const observationAfter = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/observation?goalPower=4000`,
      'GET',
    )
    assert.equal(observationAfter.status, 200, `failed receipt observation route failed: ${JSON.stringify(observationAfter.data)}`)
    const observation = readObject(readObject(observationAfter.data).observation)
    const failureHistory = readObject(observation.failureHistory)
    const failedReceipts = readArray(failureHistory.failedReceipts).map((item) => readObject(item))
    assert.ok(
      failedReceipts.some((receipt) => receipt.proposalId === failedReceipt.proposalId && receipt.action === 'march_move'),
      'next observation should expose the failed executor receipt for recovery planning',
    )
  } finally {
    await backend.stop()
  }
}

async function run() {
  const requestedMaxSteps = readRequestedMaxSteps()
  const seeded = pickConnectedDevelopmentTiles()
  const backend = await bootAutonomousDevelopmentBackend(seeded.path)
  try {
    const observationBefore = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/observation?goalPower=4000`,
      'GET',
    )
    assert.equal(observationBefore.status, 200, `observation route failed: ${JSON.stringify(observationBefore.data)}`)
    const observation = readObject(readObject(observationBefore.data).observation)
    assert.ok(readObject(observation.battleReports), 'observation should include battle reports')
    assert.ok(readObject(observation.enemyIntel), 'observation should include enemy intel')
    assert.ok(readObject(observation.failureHistory), 'observation should include failure history')
    assert.ok(observation.buildings && typeof observation.buildings === 'object', 'observation should include buildings snapshot')
    assert.ok(observation.queues && typeof observation.queues === 'object', 'observation should include queue snapshot')

    const runResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/run`,
      'POST',
      {
        maxSteps: 5,
        goalPower: 4000,
        triggeredBy: 'autonomous_development_fixture_gate',
      },
      90_000,
    )
    assert.equal(runResponse.status, 200, `autonomous development run failed: ${JSON.stringify(runResponse.data)}`)
    const payload = readObject(runResponse.data)
    assert.equal(payload.ok, true)
    const runPayload = readObject(payload.run)
    assert.equal(runPayload.aiPlayerId, AI_PLAYER_ID)
    assert.equal(runPayload.stepCount, 5)
    assert.deepEqual(
      readArray(runPayload.steps).map((item) => String(readObject(item).selectedAction)),
      ['tile_occupy', 'resource_gather', 'march_move', 'tile_occupy', 'resource_gather'],
      'fixture gate should execute a deterministic five-step development loop',
    )

    for (const step of readArray(runPayload.steps).map((item) => readObject(item))) {
      assert.ok(readObject(step.observation), 'each step should keep the backend observation snapshot')
      assert.ok(readObject(step.plannerDecision), 'each step should keep the backend planner decision')
      assert.equal(readObject(step.receipt).ok, true, 'each executor receipt should succeed')
      assertPlayerLanguage(step.naturalLanguageResult, 'naturalLanguageResult')
    }

    const personalReports = readArray(runPayload.personalReports).map((item) => readObject(item))
    assert.equal(personalReports.length, 5, 'autonomous run should write one personal report per executed step')
    for (const report of personalReports) {
      assert.equal(report.ownerPlayerId, GOVERNOR_PLAYER_ID)
      assert.equal(report.actorType, 'ai_player')
      assert.equal(report.aiPlayerId, AI_PLAYER_ID)
      assert.equal(report.factionId, FACTION_ID)
      assertPlayerLanguage(report.summary, 'personal report summary')
      assertPlayerLanguage(report.result, 'personal report result')
    }

    const reportsResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/personal-reports?limit=5`,
      'GET',
    )
    assert.equal(reportsResponse.status, 200, `personal reports route failed: ${JSON.stringify(reportsResponse.data)}`)
    assert.equal(readArray(readObject(reportsResponse.data).items).length, 5)

    const playerReportsResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/player-reports?limit=5`,
      'GET',
    )
    assert.equal(playerReportsResponse.status, 200, `player reports route failed: ${JSON.stringify(playerReportsResponse.data)}`)
    const playerReports = readArray(readObject(playerReportsResponse.data).items).map((item) => readObject(item))
    assert.ok(playerReports.some((report) => report.itemKind === 'ai_autonomous_development'), 'player report list should include AI autonomous development reports')

    const chatResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=8`,
      'GET',
    )
    assert.equal(chatResponse.status, 200, `chat history route failed: ${JSON.stringify(chatResponse.data)}`)
    const messages = readArray(readObject(chatResponse.data).messages).map((item) => readObject(item))
    const autonomousMessages = messages.filter((message) => (
      String(readObject(message.metadata ?? {}).source ?? '') === 'autonomous_development_executor'
    ))
    assert.ok(autonomousMessages.length >= 5, 'autonomous executor should write natural-language chat results')
    for (const message of autonomousMessages) {
      assertPlayerLanguage(message.body, 'chat autonomous result')
    }

    const worldAfter = await loadWorldState(backend.baseUrl)
    const factionAfter = worldAfter.factions[FACTION_ID]
    assert.ok(factionAfter, 'faction should exist after autonomous development run')
    const unitAfter = worldAfter.units.find((unit) => unit.id === seeded.unitId)
    assert.equal(unitAfter?.tileId, seeded.secondTileId, 'unit should end on the second resource tile after step 3')
    const tileStates = (worldAfter.map as unknown as { tileStates?: Array<{ id: string; owner?: string }> }).tileStates ?? []
    const firstTileAfter = tileStates.find((tile) => tile.id === seeded.firstTileId)
    const secondTileAfter = tileStates.find((tile) => tile.id === seeded.secondTileId)
    assert.equal(firstTileAfter?.owner, FACTION_ID, 'first resource tile should be occupied')
    assert.equal(secondTileAfter?.owner, FACTION_ID, 'second resource tile should be occupied')
    const accountAfter = factionAfter.aiResourceAccounts?.[AI_PLAYER_ID]
    assert.ok(accountAfter, 'AI resource account should exist after autonomous development run')
    assert.equal(accountAfter.resources.wood, 10, 'first resourceLevel 1 wood tile should be gathered once')
    assert.equal(accountAfter.resources.stone, 20, 'second resourceLevel 2 stone tile should be gathered once')

    await sleep(1400)
    await backend.stop()
    const restarted = await bootAutonomousDevelopmentBackend(seeded.path, {
      persistPaths: {
        aiPlayerPersistPath: backend.aiPlayerPersistPath,
        sessionPersistPath: backend.sessionPersistPath,
      },
      register: false,
    })
    try {
      const restoredReportsResponse = await requestJson(
        restarted.baseUrl,
        `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/personal-reports?limit=5`,
        'GET',
      )
      assert.equal(restoredReportsResponse.status, 200, `restored personal reports route failed: ${JSON.stringify(restoredReportsResponse.data)}`)
      assert.equal(readArray(readObject(restoredReportsResponse.data).items).length, 5, 'personal reports should persist across backend restart')
    } finally {
      await restarted.stop()
    }

    if (requestedMaxSteps >= 20) {
      await runTwentyStepRecoveryGate()
      await runFailedReceiptRecoveryGate()
    }

    const llmSeeded = pickConnectedDevelopmentTiles()
    const llmBackend = await bootAutonomousDevelopmentBackend(llmSeeded.path, {
      envOverrides: {
        AI_PLAYER_AUTONOMOUS_DEVELOPMENT_MODEL_MOCK_OUTPUT: JSON.stringify({
          summary: '模型选择先占领脚下资源地',
          proposals: [
            {
              action: 'tile_occupy',
              args: {
                unitId: llmSeeded.unitId,
                tileId: llmSeeded.firstTileId,
              },
              reason: '资源：脚下资源地可拿；目标：先占领当前地块；风险：低压力中立地；批准后结果：后端执行占地并记录战果。',
            },
          ],
          deferReason: '',
          needsHumanReview: false,
        }),
      },
    })
    try {
      const llmRun = await requestJson(
        llmBackend.baseUrl,
        `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/run`,
        'POST',
        {
          maxSteps: 1,
          plannerMode: 'llm',
          triggeredBy: 'autonomous_development_llm_fixture_gate',
        },
        90_000,
      )
      assert.equal(llmRun.status, 200, `llm planner autonomous run failed: ${JSON.stringify(llmRun.data)}`)
      const llmStep = readObject(readArray(readObject(readObject(llmRun.data).run).steps)[0])
      const llmDecision = readObject(llmStep.plannerDecision)
      assert.equal(llmDecision.plannerSource, 'llm', 'LLM planner should mark plannerSource')
      assert.equal(llmStep.selectedAction, 'tile_occupy')
      assert.equal(readObject(llmStep.receipt).ok, true, 'LLM planner output should still execute through backend receipt')
    } finally {
      await llmBackend.stop()
    }

    console.log('[ai_player_autonomous_development_loop_gate] all checks passed')
  } finally {
    await backend.stop()
  }
}

run().catch((error) => {
  console.error('[ai_player_autonomous_development_loop_gate] failed:', error)
  process.exitCode = 1
})
