import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createInitialWorldState } from '../../../shared/domain/scenario'
import {
  buildSessionPersistPath,
  getAvailablePort,
  readArray,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from '../../tests/helpers/backendHarness'
import { DEFAULT_AI_PLAYER_RUNTIME_MODEL } from '../application/ai/aiPlayerRuntimeModelTarget'

type GateCheck = {
  name: string
  passed: boolean
  details?: Record<string, unknown>
}

type GateReport = {
  ok: boolean
  status: 'pass' | 'fail'
  generatedAt: string
  target: {
    host: string
    model: string
    defaultModel: string
    defaultModelSource: 'DEFAULT_AI_PLAYER_RUNTIME_MODEL'
    protocol: 'openai_compat'
    hasKey: boolean
    secretSources: string[]
    secretPolicy: 'env_only_no_file_no_echo'
  }
  limits: Record<string, string>
  checks: GateCheck[]
  summary: Record<string, unknown>
  failure?: Record<string, unknown>
  reportPath?: string
  stampedReportPath?: string
}

const AI_PLAYER_ID = 'live_autonomous_combat_ai'
const FACTION_ID = 'player'
const ENEMY_FACTION_ID = 'enemy'
const GOVERNOR_PLAYER_ID = 'human_live_combat_gate'
const SECRET_ENV_NAME = 'AI_PLAYER_RUNTIME_MODEL_API_KEY'
const LATEST_REPORT_PATH = join(process.cwd(), 'tmp', 'gates', 'ai_player_live_autonomous_combat_planner_gate_latest.json')

function targetHost(baseUrl: string) {
  try {
    return new URL(baseUrl).host
  } catch {
    return 'invalid'
  }
}

function sanitizeError(error: unknown) {
  const normalized = error instanceof Error ? error : new Error(String(error))
  return {
    name: normalized.name,
    message: normalized.message,
    stackHead: normalized.stack?.split(/\r?\n/).slice(0, 6),
  }
}

function pushCheck(checks: GateCheck[], name: string, passed: boolean, details?: Record<string, unknown>) {
  checks.push({ name, passed, details })
}

function writeReport(report: GateReport) {
  mkdirSync(dirname(LATEST_REPORT_PATH), { recursive: true })
  const stampedReportPath = LATEST_REPORT_PATH.replace(
    /\.json$/,
    `_${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  )
  const payload = {
    ...report,
    reportPath: LATEST_REPORT_PATH,
    stampedReportPath,
  }
  writeFileSync(LATEST_REPORT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')
  writeFileSync(stampedReportPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')
}

function seedWorldStateWithHighPressureCombatTarget() {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding live autonomous combat gate`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding live autonomous combat gate`)
  const targetTileId = world.map.connections[unit.tileId]?.[0]
  assert.ok(targetTileId, `missing adjacent target for ${unit.tileId}`)
  const targetTile = world.map.tiles.find((candidate) => candidate.id === targetTileId)
  assert.ok(targetTile, `missing target tile ${targetTileId}`)

  unit.aiPlayerId = AI_PLAYER_ID
  unit.status = '待命'
  unit.currentTask = undefined
  unit.strength = 120
  unit.supply = 9
  unit.mobility = Math.max(unit.mobility, 20)

  targetTile.name = '高压敌军前哨'
  targetTile.type = 'plain'
  targetTile.terrain = 'grassland'
  targetTile.owner = ENEMY_FACTION_ID
  targetTile.enemyPressure = 6
  targetTile.moveCost = 1

  faction.actionPoints = 100
  faction.food = Math.max(faction.food ?? 0, 100)
  faction.aiPlayers = [{
    id: AI_PLAYER_ID,
    name: '战场参谋',
    factionId: FACTION_ID,
    unitIds: [unit.id],
    specialty: 'assault',
  }]
  world.feedback.battleRecords = [{
    id: 'live_autonomous_combat_pressure_seed',
    tick: world.tick + 1,
    regionId: 'live_autonomous_combat_gate',
    tileId: targetTile.id,
    attackerFaction: FACTION_ID,
    attackerUnitId: unit.id,
    outcome: 'draw',
    attackerLoss: 12,
    defenderLoss: 8,
    alliedSupport: 0,
    summary: '目标敌压较高，应先侦察或换更稳打法。',
  }]

  const path = buildSessionPersistPath('ai_player_live_autonomous_combat_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    path,
    unitId: unit.id,
    targetTileId: targetTile.id,
  }
}

async function runGate() {
  const apiKey = process.env[SECRET_ENV_NAME]?.trim()
  const baseModelUrl = process.env.AI_PLAYER_RUNTIME_MODEL_BASE_URL?.trim() || 'https://api.deepseek.com'
  const model = process.env.AI_PLAYER_RUNTIME_MODEL?.trim() || DEFAULT_AI_PLAYER_RUNTIME_MODEL
  const limits = {
    AI_PLAYER_PROVIDER_BUDGET_WINDOW_MS: '86400000',
    AI_PLAYER_PROVIDER_BUDGET_MAX_RUNS_PER_WINDOW: '1',
    AI_PLAYER_PROVIDER_BUDGET_MAX_TOTAL_TOKENS_PER_WINDOW: '12000',
    AI_PLAYER_PROVIDER_BUDGET_MAX_COST_USD_PER_WINDOW: '0.05',
    AI_PLAYER_RUNTIME_MODEL_MAX_CONCURRENCY: '1',
    AI_PLAYER_RUNTIME_MODEL_QUEUE_LIMIT: '1',
    AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_REQUESTS: '1',
    AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_WINDOW_MS: '3600000',
  }
  const checks: GateCheck[] = []
  const summary: Record<string, unknown> = {}
  const reportBase = {
    generatedAt: new Date().toISOString(),
    target: {
      host: targetHost(baseModelUrl),
      model,
      defaultModel: DEFAULT_AI_PLAYER_RUNTIME_MODEL,
      defaultModelSource: 'DEFAULT_AI_PLAYER_RUNTIME_MODEL' as const,
      protocol: 'openai_compat' as const,
      hasKey: Boolean(apiKey),
      secretSources: apiKey ? [SECRET_ENV_NAME] : [],
      secretPolicy: 'env_only_no_file_no_echo' as const,
    },
    limits,
    checks,
    summary,
  }

  pushCheck(checks, 'api_key_available', Boolean(apiKey), { source: SECRET_ENV_NAME })
  assert.ok(apiKey, `${SECRET_ENV_NAME} is required`)

  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const seeded = seedWorldStateWithHighPressureCombatTarget()
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: seeded.path,
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_live_autonomous_combat_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_live_autonomous_combat_session_state'),
    AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: buildSessionPersistPath('ai_player_live_autonomous_combat_provider_account_state'),
    AI_PLAYER_RUNTIME_MODEL_DISPATCH_STORE_PATH: buildSessionPersistPath('ai_player_live_autonomous_combat_model_dispatch_state'),
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: baseModelUrl,
    AI_PLAYER_RUNTIME_MODEL: model,
    AI_PLAYER_RUNTIME_MODEL_API_KEY: apiKey,
    ...limits,
  })

  try {
    const health = await waitForHealth(baseUrl)
    pushCheck(checks, 'backend_health', Boolean(health), { baseUrl })
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: FACTION_ID,
      playerName: GOVERNOR_PLAYER_ID,
    })
    pushCheck(checks, 'session_join', join.status === 200, { status: join.status })
    assert.equal(join.status, 200, `session join failed: ${JSON.stringify(join.data)}`)

    const grant = await requestJson(baseUrl, '/api/ai/provider/ai-command-credits/grants', 'POST', {
      accountId: GOVERNOR_PLAYER_ID,
      worldId: FACTION_ID,
      amountCredits: 100,
      reason: 'live_autonomous_combat_planner_gate',
    })
    pushCheck(checks, 'ai_command_credit_grant', grant.status === 200, { status: grant.status })
    assert.equal(grant.status, 200, `credit grant failed: ${JSON.stringify(grant.data)}`)

    const balanceBefore = await requestJson(
      baseUrl,
      `/api/ai/provider/ai-command-credits/balance?accountId=${encodeURIComponent(GOVERNOR_PLAYER_ID)}&worldId=${encodeURIComponent(FACTION_ID)}`,
      'GET',
    )
    assert.equal(balanceBefore.status, 200, `balance before failed: ${JSON.stringify(balanceBefore.data)}`)
    summary.aiCommandCreditAvailableBefore = readObject(balanceBefore.data).availableCredits

    const register = await requestJson(baseUrl, '/api/ai/players', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      displayName: '战场参谋',
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      actionWhitelist: ['world_scout', 'march_move', 'garrison_set', 'troop_heal', 'tile_occupy'],
      runtimePolicy: {
        allowRuleProposals: true,
        allowLlmProposals: true,
      },
    })
    pushCheck(checks, 'ai_player_registered', register.status === 200, { status: register.status })
    assert.equal(register.status, 200, `register failed: ${JSON.stringify(register.data)}`)

    const runResponse = await requestJson(
      baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/run`,
      'POST',
      {
        maxSteps: 1,
        limit: 6,
        plannerMode: 'llm',
      },
      120_000,
    )
    pushCheck(checks, 'live_llm_combat_run_status_200', runResponse.status === 200, { status: runResponse.status })
    assert.equal(runResponse.status, 200, `live autonomous combat planner run failed: ${JSON.stringify(runResponse.data)}`)
    const runPayload = readObject(readObject(runResponse.data).run)
    const step = readObject(readArray(runPayload.steps)[0])
    const decision = readObject(step.plannerDecision)
    const receipt = readObject(step.receipt)
    summary.stepCount = runPayload.stepCount
    summary.plannerSource = decision.plannerSource
    summary.plannerModel = decision.model
    summary.selectedAction = step.selectedAction
    summary.proposalId = step.proposalId
    summary.receiptOk = receipt.ok
    summary.receiptWorldAction = receipt.worldAction
    summary.naturalLanguageResult = step.naturalLanguageResult
    pushCheck(checks, 'planner_source_llm', decision.plannerSource === 'llm', { plannerSource: decision.plannerSource, model: decision.model })
    assert.equal(decision.plannerSource, 'llm')
    pushCheck(checks, 'executor_receipt_success', receipt.ok === true, { worldAction: receipt.worldAction, failureCode: receipt.failureCode })
    assert.equal(receipt.ok, true)

    const proposals = await requestJson(baseUrl, `/api/ai/players/proposals?aiPlayerId=${AI_PLAYER_ID}&limit=10`, 'GET')
    assert.equal(proposals.status, 200, `proposal list failed: ${JSON.stringify(proposals.data)}`)
    const proposalItems = readArray(readObject(proposals.data).items).map((item) => readObject(item))
    const createdProposal = proposalItems.find((item) => item.proposalId === step.proposalId)
    summary.proposalSource = createdProposal?.source
    pushCheck(checks, 'proposal_source_llm', createdProposal?.source === 'llm', { source: createdProposal?.source })
    assert.equal(createdProposal?.source, 'llm')

    const personalReports = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/personal-reports?limit=5`, 'GET')
    assert.equal(personalReports.status, 200, `combat personal reports failed: ${JSON.stringify(personalReports.data)}`)
    const personalReportItems = readArray(readObject(personalReports.data).items).map((item) => readObject(item))
    const latestPersonalReport = personalReportItems[0]
    summary.personalReportCount = personalReportItems.length
    summary.personalReportCategory = latestPersonalReport?.category
    pushCheck(checks, 'combat_personal_report_written_by_backend', latestPersonalReport?.category === 'combat', { count: personalReportItems.length })
    assert.equal(latestPersonalReport?.category, 'combat')

    const playerReports = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/player-reports?limit=5`, 'GET')
    assert.equal(playerReports.status, 200, `combat player reports failed: ${JSON.stringify(playerReports.data)}`)
    const playerReportItems = readArray(readObject(playerReports.data).items).map((item) => readObject(item))
    const hasCombatReport = playerReportItems.some((item) => item.itemKind === 'ai_autonomous_combat')
    summary.playerReportCount = playerReportItems.length
    pushCheck(checks, 'player_reports_include_combat_result', hasCombatReport, { count: playerReportItems.length })
    assert.ok(hasCombatReport, 'player reports should include autonomous combat result')

    const balanceAfter = await requestJson(
      baseUrl,
      `/api/ai/provider/ai-command-credits/balance?accountId=${encodeURIComponent(GOVERNOR_PLAYER_ID)}&worldId=${encodeURIComponent(FACTION_ID)}`,
      'GET',
    )
    assert.equal(balanceAfter.status, 200, `balance after failed: ${JSON.stringify(balanceAfter.data)}`)
    summary.aiCommandCreditAvailableAfter = readObject(balanceAfter.data).availableCredits
    pushCheck(checks, 'ai_command_credits_consumed_or_accounted', Number(summary.aiCommandCreditAvailableAfter) < Number(summary.aiCommandCreditAvailableBefore), {
      before: summary.aiCommandCreditAvailableBefore,
      after: summary.aiCommandCreditAvailableAfter,
    })
    assert.ok(Number(summary.aiCommandCreditAvailableAfter) < Number(summary.aiCommandCreditAvailableBefore))

    writeReport({
      ok: true,
      status: 'pass',
      ...reportBase,
    })
    console.log(`[AI Player Live Autonomous Combat Planner Gate] ok=true action=${String(step.selectedAction)} receiptWorldAction=${String(receipt.worldAction)} latest=${LATEST_REPORT_PATH}`)
  } catch (error) {
    writeReport({
      ok: false,
      status: 'fail',
      ...reportBase,
      failure: {
        ...sanitizeError(error),
        backendStdoutTail: tail.stdout,
        backendStderrTail: tail.stderr,
      },
    })
    throw error
  } finally {
    await shutdownChild(child)
  }
}

runGate().catch((error) => {
  console.error(`[AI Player Live Autonomous Combat Planner Gate] failed: ${sanitizeError(error).message}`)
  process.exitCode = 1
})
