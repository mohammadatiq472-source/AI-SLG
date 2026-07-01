import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createInitialWorldState } from '../../../shared/domain/scenario'
import {
  type AiPlayerHttpBackend,
  type AiPlayerHttpPersistPaths,
  AI_PLAYER_ID,
  FACTION_ID,
  GOVERNOR_PLAYER_ID,
  joinGovernor,
  loadWorldState,
  startAiPlayerHttpBackend,
} from '../../tests/helpers/aiPlayerHttpContractHarness'
import { buildSessionPersistPath, readArray, readObject, requestJson } from '../../tests/helpers/backendHarness'

type LongRunGateReport = {
  ok: boolean
  status: 'pass' | 'fail'
  generatedAt: string
  gate: 'gate:ai:autonomous-development-loop:200' | 'gate:ai:autonomous-development-loop:500'
  mode: 'rule_fixture'
  requestedMaxSteps: number
  actualStepCount: number
  durationMs: number
  actionCounts: Record<string, number>
  receiptFailureCount: number
  failureRate: number
  stopReason: 'completed_requested_steps' | 'stopped_early' | 'unknown'
  progress: {
    chainTileCount: number
    occupiedChainTileCount: number
    gatheredChainTileCount: number
    healStepCount: number
    finalUnitTileId?: string
    finalUnitStrength?: number
    finalUnitSupply?: number
  }
  reportCounts: {
    runPersonalReports: number
    personalReports: number
    playerReportItems: number
    aiAutonomousPlayerReports: number
  }
  reportPath?: string
  stampedReportPath?: string
  failure?: {
    name: string
    message: string
    stackHead?: string[]
  }
}

type SeededLongRunWorld = {
  path: string
  unitId: string
  chainTileIds: string[]
}

const REQUESTED_MAX_STEPS = readRequestedMaxSteps()
const LONG_RUN_CHAIN_LENGTH = 96
const GATE_NAME = REQUESTED_MAX_STEPS >= 500
  ? 'gate:ai:autonomous-development-loop:500'
  : 'gate:ai:autonomous-development-loop:200'
const REPORT_PATH = join(
  process.cwd(),
  'tmp',
  'gates',
  `ai_autonomous_development_loop_${REQUESTED_MAX_STEPS}_latest.json`,
)
const AUTONOMOUS_ACTION_WHITELIST = [
  'march_move',
  'resource_gather',
  'tile_occupy',
  'troop_heal',
  'troop_train',
  'queue_fill_idle_slot',
  'building_upgrade',
  'tactical_skill_upgrade',
]
const PERSONAL_REPORT_ROUTE_LIMIT = 200

function readRequestedMaxSteps() {
  const inline = process.argv.find((arg) => arg.startsWith('--max-steps='))
  if (inline) {
    const value = Number(inline.slice('--max-steps='.length))
    return Number.isFinite(value) ? Math.trunc(value) : 200
  }
  const separateIndex = process.argv.indexOf('--max-steps')
  if (separateIndex >= 0) {
    const value = Number(process.argv[separateIndex + 1])
    return Number.isFinite(value) ? Math.trunc(value) : 200
  }
  return 200
}

function sanitizeError(error: unknown): LongRunGateReport['failure'] {
  const normalized = error instanceof Error ? error : new Error(String(error))
  return {
    name: normalized.name,
    message: normalized.message,
    stackHead: normalized.stack?.split(/\r?\n/).slice(0, 8),
  }
}

function writeReport(report: LongRunGateReport) {
  mkdirSync(dirname(REPORT_PATH), { recursive: true })
  const stampedReportPath = REPORT_PATH.replace(
    /\.json$/,
    `_${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  )
  const payload = {
    ...report,
    reportPath: REPORT_PATH,
    stampedReportPath,
  }
  writeFileSync(REPORT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')
  writeFileSync(stampedReportPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')
}

function countByAction(steps: Record<string, unknown>[]) {
  const counts: Record<string, number> = {}
  for (const step of steps) {
    const action = String(step.selectedAction ?? 'unknown')
    counts[action] = (counts[action] ?? 0) + 1
  }
  return counts
}

function assertPlayerLanguage(value: unknown, label: string) {
  assert.equal(typeof value, 'string', `${label} should be string`)
  const text = String(value)
  assert.ok(text.trim().length >= 6, `${label} should be non-empty player-facing language`)
  for (const forbidden of ['proposal', 'worldAction', 'MCP', 'tool', 'JSON', 'approve', 'execute']) {
    assert.equal(text.includes(forbidden), false, `${label} should not leak engineering wording: ${forbidden}`)
  }
}

function seedLongRunWorld(): SeededLongRunWorld {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding long-run autonomous development gate`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding long-run autonomous development gate`)

  const chainTileIds = Array.from({ length: LONG_RUN_CHAIN_LENGTH }, (_item, index) => `grid_${index}_0`)
  const tileById = new Map(world.map.tiles.map((tile) => [tile.id, tile] as const))
  for (const tileId of chainTileIds) {
    assert.ok(tileById.has(tileId), `missing long-run chain tile: ${tileId}`)
  }

  const resourceKinds = ['wood', 'stone', 'iron', 'food', 'copper'] as const
  for (let index = 0; index < chainTileIds.length; index += 1) {
    const tileId = chainTileIds[index]
    const tile = tileById.get(tileId)
    assert.ok(tile, `missing long-run tile ${tileId}`)
    tile.name = `AI Long Run Chain ${String(index + 1).padStart(2, '0')}`
    tile.type = 'resource'
    tile.terrain = 'grassland'
    tile.owner = index === 0 ? FACTION_ID : 'neutral'
    tile.enemyPressure = 0
    tile.scoutingDifficulty = 1
    tile.resourceKind = resourceKinds[index % resourceKinds.length]
    tile.resourceLevel = 1
    tile.moveCost = 1
    tile.district = 'ai_autonomous_long_run_gate'
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
  unit.strength = 100
  unit.mobility = 300
  unit.supply = 9
  unit.aiPlayerId = AI_PLAYER_ID

  faction.actionPoints = 10000
  faction.food = 10000
  faction.wood = 10000
  faction.stone = 10000
  faction.iron = 10000
  faction.copper = 10000
  faction.heroCommand.developmentPoints = Math.max(faction.heroCommand.developmentPoints ?? 0, 10000)
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
      id: 'ai_autonomous_long_run_seeded_first_tile_claim',
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

  const path = buildSessionPersistPath(`ai_player_autonomous_development_loop_${REQUESTED_MAX_STEPS}_world_state`)
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    path,
    unitId: unit.id,
    chainTileIds,
  }
}

async function bootLongRunBackend(
  worldPersistPath: string,
  persistPaths?: Partial<AiPlayerHttpPersistPaths>,
): Promise<AiPlayerHttpBackend> {
  const backend = await startAiPlayerHttpBackend(
    `ai_player_autonomous_development_loop_${REQUESTED_MAX_STEPS}_gate`,
    persistPaths,
    {
      WORLD_STATE_PERSIST_PATH: worldPersistPath,
      ENABLE_FULL_MAP_LAYOUT: '1',
    },
  )
  await joinGovernor(backend.baseUrl)
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
  assert.equal(register.status, 200, `register long-run AI player failed: ${JSON.stringify(register.data)}`)
  return backend
}

async function runGate() {
  const seeded = seedLongRunWorld()
  const backend = await bootLongRunBackend(seeded.path)
  const startedAt = Date.now()
  try {
    const runResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/run`,
      'POST',
      {
        maxSteps: REQUESTED_MAX_STEPS,
        goalPower: 12000,
        triggeredBy: `autonomous_development_fixture_gate_${REQUESTED_MAX_STEPS}`,
      },
      360_000,
    )
    assert.equal(runResponse.status, 200, `${REQUESTED_MAX_STEPS}-step autonomous development run failed: ${JSON.stringify(runResponse.data)}`)
    const payload = readObject(runResponse.data)
    assert.equal(payload.ok, true)
    const runPayload = readObject(payload.run)
    const steps = readArray(runPayload.steps).map((item) => readObject(item))
    const actualStepCount = Number(runPayload.stepCount)
    const actionCounts = countByAction(steps)
    const failedReceipts = steps
      .map((step) => readObject(step.receipt))
      .filter((receipt) => receipt.ok !== true)
    const failureRate = steps.length > 0 ? failedReceipts.length / steps.length : 1

    assert.equal(runPayload.requestedMaxSteps, REQUESTED_MAX_STEPS, `backend should preserve the requested ${REQUESTED_MAX_STEPS}-step target`)
    assert.equal(actualStepCount, REQUESTED_MAX_STEPS, 'long-run gate must execute the full requested step count')
    assert.equal(failedReceipts.length, 0, 'long-run gate should have no failed executor receipts')
    assert.ok((actionCounts.march_move ?? 0) >= 50, 'long-run gate should keep moving to new development targets')
    assert.ok((actionCounts.tile_occupy ?? 0) >= 50, 'long-run gate should occupy many resource targets')
    assert.ok((actionCounts.resource_gather ?? 0) >= 50, 'long-run gate should gather many occupied resources')
    assert.ok((actionCounts.troop_heal ?? 0) >= 1, 'long-run gate should recover health or supply instead of exhausting the unit')
    assert.ok(failureRate <= 0.01, 'long-run gate failure rate should stay inside the hard budget')

    for (const step of steps) {
      assertPlayerLanguage(step.naturalLanguageResult, `${REQUESTED_MAX_STEPS}-step naturalLanguageResult`)
      const report = readObject(step.personalReport)
      assertPlayerLanguage(report.summary, `${REQUESTED_MAX_STEPS}-step personal report summary`)
      assertPlayerLanguage(report.result, `${REQUESTED_MAX_STEPS}-step personal report result`)
      assert.equal(readObject(step.plannerDecision).plannerSource, 'rule', `${REQUESTED_MAX_STEPS}-step gate should stay in rule/mock mode`)
    }
    const runPersonalReports = readArray(runPayload.personalReports)
    assert.equal(runPersonalReports.length, REQUESTED_MAX_STEPS, 'run payload should keep one personal report per executed step')

    const personalReportsResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/personal-reports?limit=${PERSONAL_REPORT_ROUTE_LIMIT}`,
      'GET',
      undefined,
      90_000,
    )
    assert.equal(personalReportsResponse.status, 200, `personal reports route failed: ${JSON.stringify(personalReportsResponse.data)}`)
    const personalReports = readArray(readObject(personalReportsResponse.data).items)
    assert.equal(
      personalReports.length,
      Math.min(REQUESTED_MAX_STEPS, PERSONAL_REPORT_ROUTE_LIMIT),
      'personal reports route should expose the latest persisted autonomous reports within its route limit',
    )

    const playerReportsResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/player-reports?limit=200`,
      'GET',
      undefined,
      90_000,
    )
    assert.equal(playerReportsResponse.status, 200, `player reports route failed: ${JSON.stringify(playerReportsResponse.data)}`)
    const playerReports = readArray(readObject(playerReportsResponse.data).items).map((item) => readObject(item))
    const aiAutonomousPlayerReports = playerReports.filter((report) => report.itemKind === 'ai_autonomous_development')
    assert.ok(aiAutonomousPlayerReports.length >= 190, 'player report list should mostly contain the 200 recent AI autonomous reports')

    const worldAfter = await loadWorldState(backend.baseUrl)
    const factionAfter = worldAfter.factions[FACTION_ID]
    assert.ok(factionAfter, 'faction should exist after long-run autonomous development run')
    const unitAfter = worldAfter.units.find((unit) => unit.id === seeded.unitId)
    const tileStates = (worldAfter.map as unknown as { tileStates?: Array<{ id: string; owner?: string }> }).tileStates ?? []
    const tileOwner = (tileId: string) => tileStates.find((tile) => tile.id === tileId)?.owner
      ?? worldAfter.map.tiles.find((tile) => tile.id === tileId)?.owner
    const occupiedChainTileCount = seeded.chainTileIds.filter((tileId) => tileOwner(tileId) === FACTION_ID).length
    const gatheredChainTileCount = seeded.chainTileIds
      .filter((tileId) => Boolean(factionAfter.aiResourceGatherClaims?.[tileId]))
      .length
    assert.ok(occupiedChainTileCount >= 50, 'long-run gate should occupy at least 50 fixture chain tiles')
    assert.ok(gatheredChainTileCount >= 50, 'long-run gate should gather at least 50 fixture chain tiles')

    writeReport({
      ok: true,
      status: 'pass',
      generatedAt: new Date().toISOString(),
      gate: GATE_NAME,
      mode: 'rule_fixture',
      requestedMaxSteps: REQUESTED_MAX_STEPS,
      actualStepCount,
      durationMs: Date.now() - startedAt,
      actionCounts,
      receiptFailureCount: failedReceipts.length,
      failureRate,
      stopReason: actualStepCount === REQUESTED_MAX_STEPS ? 'completed_requested_steps' : 'stopped_early',
      progress: {
        chainTileCount: seeded.chainTileIds.length,
        occupiedChainTileCount,
        gatheredChainTileCount,
        healStepCount: actionCounts.troop_heal ?? 0,
        finalUnitTileId: unitAfter?.tileId,
        finalUnitStrength: unitAfter?.strength,
        finalUnitSupply: unitAfter?.supply,
      },
      reportCounts: {
        runPersonalReports: runPersonalReports.length,
        personalReports: personalReports.length,
        playerReportItems: playerReports.length,
        aiAutonomousPlayerReports: aiAutonomousPlayerReports.length,
      },
    })
    console.log(`[ai_autonomous_development_loop_${REQUESTED_MAX_STEPS}_gate] passed report=${REPORT_PATH}`)
  } catch (error) {
    writeReport({
      ok: false,
      status: 'fail',
      generatedAt: new Date().toISOString(),
      gate: GATE_NAME,
      mode: 'rule_fixture',
      requestedMaxSteps: REQUESTED_MAX_STEPS,
      actualStepCount: 0,
      durationMs: Date.now() - startedAt,
      actionCounts: {},
      receiptFailureCount: 0,
      failureRate: 1,
      stopReason: 'unknown',
      progress: {
        chainTileCount: seeded.chainTileIds.length,
        occupiedChainTileCount: 0,
        gatheredChainTileCount: 0,
        healStepCount: 0,
      },
      reportCounts: {
        runPersonalReports: 0,
        personalReports: 0,
        playerReportItems: 0,
        aiAutonomousPlayerReports: 0,
      },
      failure: sanitizeError(error),
    })
    throw error
  } finally {
    await backend.stop()
  }
}

runGate().catch((error) => {
  console.error(`[ai_autonomous_development_loop_${REQUESTED_MAX_STEPS}_gate] failed:`, error)
  process.exitCode = 1
})
