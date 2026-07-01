import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { createInitialWorldState } from '../../../shared/domain/scenario'
import type { Unit } from '../../../shared/contracts/game/world'
import {
  AI_PLAYER_ID,
  FACTION_ID,
  GOVERNOR_PLAYER_ID,
  joinGovernor,
  startAiPlayerHttpBackend,
} from '../../tests/helpers/aiPlayerHttpContractHarness'
import {
  buildSessionPersistPath,
  readArray,
  readObject,
  requestJson,
} from '../../tests/helpers/backendHarness'

type CombatSoakReport = {
  ok: boolean
  status: 'pass' | 'fail'
  generatedAt: string
  gate: 'gate:ai:autonomous-combat-soak:long'
  mode: 'rule_deterministic'
  durationLimitMs: number
  durationMs: number
  chunkSteps: number
  minSteps: number
  maxTotalSteps: number
  stopReason: 'duration_elapsed' | 'max_total_steps_reached' | 'failed'
  totalSteps: number
  runCount: number
  actionCounts: Record<string, number>
  receiptFailureCount: number
  objectiveKinds: string[]
  dailySummaryVisible: boolean
  playerLanguageLeakCount: number
  reportPath?: string
  stampedReportPath?: string
  failure?: {
    name: string
    message: string
    stackHead?: string[]
  }
}

const GATE_NAME = 'gate:ai:autonomous-combat-soak:long' as const
const DURATION_LIMIT_MS = readDurationMs()
const CHUNK_STEPS = readBoundedIntArg('--chunk-steps', 10, 1, 20)
const MIN_STEPS = readBoundedIntArg('--min-steps', 20, 1, 10_000)
const MAX_TOTAL_STEPS = readBoundedIntArg('--max-total-steps', 10_000, 1, 100_000)
const LOOP_DELAY_MS = readBoundedIntArg('--loop-delay-ms', 0, 0, 60_000)
const REPORT_PATH = join(process.cwd(), 'tmp', 'gates', 'ai_autonomous_combat_soak_latest.json')
const ENEMY_FACTION_ID = 'enemy'
const OTHER_PLAYER_FACTION_ID = 'rival_player_beta'
const COMBAT_ACTION_WHITELIST = [
  'world_scout',
  'city_siege',
  'rally_launch',
  'rally_join',
  'march_move',
  'garrison_set',
  'tile_occupy',
  'troop_heal',
  'troop_train',
]

function readBoundedIntArg(name: string, fallback: number, min: number, max: number) {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`))
  const raw = inline ? inline.slice(name.length + 1) : process.argv[process.argv.indexOf(name) + 1]
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.max(min, Math.min(max, Math.trunc(parsed)))
}

function readDurationMs() {
  return readBoundedIntArg('--duration-ms', 1_800_000, 1_000, 3_600_000)
}

function incrementCount(counts: Record<string, number>, key: string) {
  counts[key] = (counts[key] ?? 0) + 1
}

function sanitizeError(error: unknown): CombatSoakReport['failure'] {
  const normalized = error instanceof Error ? error : new Error(String(error))
  return {
    name: normalized.name,
    message: normalized.message,
    stackHead: normalized.stack?.split(/\r?\n/).slice(0, 8),
  }
}

function writeReport(report: CombatSoakReport) {
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

function assertNoEngineeringLanguage(value: unknown, label: string) {
  const text = JSON.stringify(value)
  for (const forbidden of ['proposalId', 'worldAction', 'MCP', 'tool', 'approve', 'execute', 'JSON']) {
    assert.equal(text.includes(forbidden), false, `${label} should not leak engineering wording: ${forbidden}`)
  }
}

function cloneCombatDefenderFrom(attacker: Unit, tileId: string, overrides: Partial<Unit> = {}): Unit {
  const defender: Unit = structuredClone(attacker)
  defender.id = overrides.id ?? `ai_combat_soak_defender_${tileId}`
  defender.name = overrides.name ?? '长跑守军'
  defender.faction = overrides.faction ?? ENEMY_FACTION_ID
  defender.aiPlayerId = undefined
  defender.tileId = tileId
  defender.status = '驻防中'
  defender.currentTask = 'Guard autonomous combat soak tile'
  defender.strength = 45
  defender.supply = 6
  defender.mobility = 8
  defender.hero = {
    ...defender.hero,
    id: `hero_${defender.id}`,
    name: overrides.hero?.name ?? '守军校尉',
    force: 48,
    command: 45,
    intelligence: 40,
    charisma: 36,
    speed: 35,
  }
  return defender
}

function seedCombatSoakWorld(): { path: string; rallyRegionId: string } {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding combat soak gate`)
  const units = world.units.filter((candidate) => candidate.faction === FACTION_ID).slice(0, 2)
  assert.ok(units.length >= 2, 'combat soak gate needs two player units')
  const siegeUnit = units[0]
  const crossPlayerUnit = units[1]
  const siegeTileId = world.map.connections[siegeUnit.tileId]?.[0] ?? crossPlayerUnit.tileId
  const siegeTile = world.map.tiles.find((tile) => tile.id === siegeTileId)
  assert.ok(siegeTile, `missing siege tile ${siegeTileId}`)
  const crossPlayerTileId = world.map.connections[crossPlayerUnit.tileId]?.find((tileId) => tileId !== siegeTileId)
    ?? world.map.connections[crossPlayerUnit.tileId]?.[0]
    ?? siegeTileId
  const crossPlayerTile = world.map.tiles.find((tile) => tile.id === crossPlayerTileId)
  assert.ok(crossPlayerTile, `missing cross-player tile ${crossPlayerTileId}`)

  for (const unit of units) {
    unit.aiPlayerId = AI_PLAYER_ID
    unit.status = '待命'
    unit.currentTask = undefined
    unit.strength = 120
    unit.supply = 9
    unit.mobility = Math.max(unit.mobility, 20)
    unit.hero.force = Math.max(unit.hero.force, 90)
    unit.hero.command = Math.max(unit.hero.command, 88)
    unit.corps.readiness = 100
  }

  siegeTile.owner = 'hostile_city_player'
  siegeTile.type = 'city'
  siegeTile.terrain = 'grassland'
  siegeTile.cityDurabilityRole = 'center'
  siegeTile.cityDurabilityMax = 300
  siegeTile.cityDurability = 300
  siegeTile.enemyPressure = 8
  siegeTile.moveCost = 1
  siegeTile.name = '长跑攻城敌城'
  crossPlayerTile.owner = OTHER_PLAYER_FACTION_ID
  crossPlayerTile.type = 'plain'
  crossPlayerTile.terrain = 'grassland'
  crossPlayerTile.enemyPressure = 6
  crossPlayerTile.moveCost = 1
  crossPlayerTile.name = '长跑跨玩家前沿'

  siegeUnit.tileId = siegeTile.id
  world.units = world.units.filter((unit) => (
    unit.id === siegeUnit.id
    || unit.id === crossPlayerUnit.id
    || (unit.faction !== ENEMY_FACTION_ID && unit.faction !== OTHER_PLAYER_FACTION_ID && unit.tileId !== siegeTile.id)
  ))
  world.units.push(cloneCombatDefenderFrom(crossPlayerUnit, crossPlayerTile.id, {
    id: 'ai_combat_soak_cross_player_defender',
    faction: OTHER_PLAYER_FACTION_ID,
    name: '跨玩家前沿守军',
  }))

  const rallyRegion = world.map.regions.find((region) => region.tileIds.includes(crossPlayerTile.id))
    ?? world.map.regions[0]
  assert.ok(rallyRegion, 'missing combat soak rally region')
  const rallyRegionId = rallyRegion.id
  world.alliance.directives[rallyRegionId] = {
    regionId: rallyRegionId,
    stance: 'support',
    assignedCommanderId: world.alliance.commanders[0]?.id ?? 'alliance_commander_combat_soak',
    supportLevel: 85,
    summary: '长周期战斗长跑需要同盟集结支援。',
  }

  faction.actionPoints = 500
  faction.food = 500
  faction.aiPlayers = [{
    id: AI_PLAYER_ID,
    name: 'Player Operator Alpha',
    factionId: FACTION_ID,
    unitIds: units.map((unit) => unit.id),
    specialty: 'assault',
  }]
  world.feedback.battleRecords = []

  const path = buildSessionPersistPath('ai_player_autonomous_combat_long_soak_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { path, rallyRegionId }
}

async function bootCombatBackend(path: string) {
  const backend = await startAiPlayerHttpBackend(
    'ai_player_autonomous_combat_long_soak',
    undefined,
    {
      WORLD_STATE_PERSIST_PATH: path,
    },
  )
  await joinGovernor(backend.baseUrl)
  const register = await requestJson(backend.baseUrl, '/api/ai/players', 'POST', {
    aiPlayerId: AI_PLAYER_ID,
    displayName: 'Player Operator Alpha',
    governorPlayerId: GOVERNOR_PLAYER_ID,
    factionId: FACTION_ID,
    actionWhitelist: COMBAT_ACTION_WHITELIST,
    budgetPolicy: {
      allowHighRiskActions: true,
    },
  })
  assert.equal(register.status, 200, `register combat soak AI player failed: ${JSON.stringify(register.data)}`)
  return backend
}

async function advanceWorld(baseUrl: string) {
  const advanced = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
    action: 'advanceTick',
  }, 60_000)
  assert.equal(advanced.status, 200, `advance combat soak world failed: ${JSON.stringify(advanced.data)}`)
  assert.equal(readObject(advanced.data).ok, true, 'advance combat soak world should succeed')
}

async function clearPlanExecution(baseUrl: string) {
  const clear = await requestJson(
    baseUrl,
    '/api/world/action?includeWorld=false',
    'POST',
    {
      action: 'clearPlanExecution',
      payload: { factionId: FACTION_ID },
    },
    60_000,
  )
  assert.equal(clear.status, 200, `clear combat soak plan failed: ${JSON.stringify(clear.data)}`)
  assert.equal(readObject(clear.data).ok, true, 'clear combat soak plan should succeed')
}

async function runGate() {
  const seeded = seedCombatSoakWorld()
  const backend = await bootCombatBackend(seeded.path)
  const startedAt = Date.now()
  const actionCounts: Record<string, number> = {}
  let totalSteps = 0
  let runCount = 0
  let receiptFailureCount = 0
  let playerLanguageLeakCount = 0
  const objectiveKinds = new Set<string>()

  try {
    const observationResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/observation?limit=12`,
      'GET',
    )
    assert.equal(observationResponse.status, 200, `combat soak observation failed: ${JSON.stringify(observationResponse.data)}`)
    const observation = readObject(readObject(observationResponse.data).observation)
    for (const objective of readArray(observation.warObjectives).map((item) => readObject(item))) {
      objectiveKinds.add(String(objective.kind))
    }
    assert.ok(objectiveKinds.has('siege'), 'combat soak should include siege objective')
    assert.ok(objectiveKinds.has('alliance_rally'), 'combat soak should include alliance rally objective')
    assert.ok(objectiveKinds.has('cross_player_target'), 'combat soak should include cross-player objective')

    let stopReason: CombatSoakReport['stopReason'] = 'duration_elapsed'
    while (Date.now() - startedAt < DURATION_LIMIT_MS && totalSteps < MAX_TOTAL_STEPS) {
      for (let chunkIndex = 0; chunkIndex < CHUNK_STEPS; chunkIndex += 1) {
        if (Date.now() - startedAt >= DURATION_LIMIT_MS || totalSteps >= MAX_TOTAL_STEPS) {
          break
        }
        const run = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/run`, 'POST', {
          maxSteps: 1,
          limit: 12,
        })
        assert.equal(run.status, 200, `combat soak step failed: ${JSON.stringify(run.data)}`)
        runCount += 1
        const runPayload = readObject(readObject(run.data).run)
        const steps = readArray(runPayload.steps).map((step) => readObject(step))
        assert.equal(steps.length, 1, 'combat soak single-step run should produce one step')
        for (const step of steps) {
          const receipt = readObject(step.receipt)
          assert.equal(receipt.ok, true, `combat soak step receipt should succeed: ${JSON.stringify(receipt)}`)
          const selectedAction = String(step.selectedAction)
          incrementCount(actionCounts, selectedAction)
          try {
            assertNoEngineeringLanguage(readObject(step.personalReport), `personal report ${totalSteps + 1}`)
          } catch {
            playerLanguageLeakCount += 1
          }
          totalSteps += 1
        }
        await advanceWorld(backend.baseUrl)
        await clearPlanExecution(backend.baseUrl)
      }
      if (LOOP_DELAY_MS > 0) {
        await delay(LOOP_DELAY_MS)
      }
    }
    if (totalSteps >= MAX_TOTAL_STEPS) {
      stopReason = 'max_total_steps_reached'
    }

    assert.ok(totalSteps >= MIN_STEPS, `combat soak should reach at least ${MIN_STEPS} steps, got ${totalSteps}`)
    assert.equal(receiptFailureCount, 0, 'combat soak should not leave failed receipts')
    assert.equal(playerLanguageLeakCount, 0, 'combat soak player language should not leak engineering fields')
    assert.ok((actionCounts.city_siege ?? 0) >= 1, 'combat soak should exercise real city siege authority')
    assert.ok(
      (actionCounts.rally_launch ?? 0) >= 1 || (actionCounts.rally_join ?? 0) >= 1,
      'combat soak should exercise real rally authority',
    )

    const summaryResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/daily-summary?limit=50`,
      'GET',
    )
    assert.equal(summaryResponse.status, 200, `combat daily summary failed: ${JSON.stringify(summaryResponse.data)}`)
    const summary = readObject(readObject(summaryResponse.data).summary)
    assert.equal(summary.itemKind, 'ai_autonomous_combat_daily_summary')
    assert.match(String(summary.summary), /今日|本日|战斗|侦察|攻城|集结|目标/)
    assertNoEngineeringLanguage(summary, 'daily summary')

    const report: CombatSoakReport = {
      ok: true,
      status: 'pass',
      generatedAt: new Date().toISOString(),
      gate: GATE_NAME,
      mode: 'rule_deterministic',
      durationLimitMs: DURATION_LIMIT_MS,
      durationMs: Date.now() - startedAt,
      chunkSteps: CHUNK_STEPS,
      minSteps: MIN_STEPS,
      maxTotalSteps: MAX_TOTAL_STEPS,
      stopReason,
      totalSteps,
      runCount,
      actionCounts,
      receiptFailureCount,
      objectiveKinds: Array.from(objectiveKinds).sort(),
      dailySummaryVisible: true,
      playerLanguageLeakCount,
    }
    writeReport(report)
    console.log(JSON.stringify({ ok: true, reportPath: REPORT_PATH, totalSteps, runCount, actionCounts }, null, 2))
  } finally {
    await backend.stop()
  }
}

runGate().catch((error) => {
  const report: CombatSoakReport = {
    ok: false,
    status: 'fail',
    generatedAt: new Date().toISOString(),
    gate: GATE_NAME,
    mode: 'rule_deterministic',
    durationLimitMs: DURATION_LIMIT_MS,
    durationMs: 0,
    chunkSteps: CHUNK_STEPS,
    minSteps: MIN_STEPS,
    maxTotalSteps: MAX_TOTAL_STEPS,
    stopReason: 'failed',
    totalSteps: 0,
    runCount: 0,
    actionCounts: {},
    receiptFailureCount: 0,
    objectiveKinds: [],
    dailySummaryVisible: false,
    playerLanguageLeakCount: 0,
    failure: sanitizeError(error),
  }
  writeReport(report)
  console.error('[ai_player_autonomous_combat_soak_gate] failed:', error)
  process.exitCode = 1
})
