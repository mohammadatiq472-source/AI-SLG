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

export type LiveAutonomousCombatRecoveryGateReport = GateReport

const AI_PLAYER_ID = 'live_autonomous_combat_recovery_ai'
const FACTION_ID = 'player'
const GOVERNOR_PLAYER_ID = 'human_live_combat_recovery_gate'
const SECRET_ENV_NAME = 'AI_PLAYER_RUNTIME_MODEL_API_KEY'
const LATEST_REPORT_PATH = join(process.cwd(), 'tmp', 'gates', 'ai_player_live_autonomous_combat_recovery_gate_latest.json')
const RECOVERY_CHAIN_STEPS = 3

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

function writeReport(report: GateReport): GateReport {
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
  return payload
}

function seedWorldStateWithDamagedUnit() {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding live recovery gate`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding live recovery gate`)
  const tile = world.map.tiles.find((candidate) => candidate.id === unit.tileId)
  assert.ok(tile, `missing unit tile ${unit.tileId}`)

  unit.aiPlayerId = AI_PLAYER_ID
  unit.status = '待命'
  unit.currentTask = undefined
  unit.strength = 10
  unit.supply = 0
  unit.mobility = Math.max(unit.mobility, 20)
  tile.owner = FACTION_ID
  tile.enemyPressure = 1

  faction.actionPoints = 100
  faction.food = 100
  faction.aiPlayers = [{
    id: AI_PLAYER_ID,
    name: '战损整补参谋',
    factionId: FACTION_ID,
    unitIds: [unit.id],
    specialty: 'logistics',
  }]
  world.feedback.battleRecords = [{
    id: 'live_autonomous_combat_recovery_seed',
    tick: world.tick + 1,
    regionId: 'live_autonomous_combat_recovery_gate',
    tileId: unit.tileId,
    attackerFaction: FACTION_ID,
    attackerUnitId: unit.id,
    outcome: 'loss',
    attackerLoss: 76,
    defenderLoss: 12,
    alliedSupport: 0,
    summary: '前线部队战损严重，当前只能先整补再恢复行动。',
  }]

  const path = buildSessionPersistPath('ai_player_live_autonomous_combat_recovery_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    path,
    unitId: unit.id,
  }
}

export async function runGate(): Promise<LiveAutonomousCombatRecoveryGateReport> {
  const apiKey = process.env[SECRET_ENV_NAME]?.trim()
  const baseModelUrl = process.env.AI_PLAYER_RUNTIME_MODEL_BASE_URL?.trim() || 'https://api.deepseek.com'
  const model = process.env.AI_PLAYER_RUNTIME_MODEL?.trim() || DEFAULT_AI_PLAYER_RUNTIME_MODEL
  const limits = {
    AI_PLAYER_PROVIDER_BUDGET_WINDOW_MS: '86400000',
    AI_PLAYER_PROVIDER_BUDGET_MAX_RUNS_PER_WINDOW: String(RECOVERY_CHAIN_STEPS),
    AI_PLAYER_PROVIDER_BUDGET_MAX_TOTAL_TOKENS_PER_WINDOW: '36000',
    AI_PLAYER_PROVIDER_BUDGET_MAX_COST_USD_PER_WINDOW: '0.15',
    AI_PLAYER_RUNTIME_MODEL_MAX_CONCURRENCY: '1',
    AI_PLAYER_RUNTIME_MODEL_QUEUE_LIMIT: String(RECOVERY_CHAIN_STEPS),
    AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_REQUESTS: String(RECOVERY_CHAIN_STEPS),
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
  const seeded = seedWorldStateWithDamagedUnit()
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: seeded.path,
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_live_autonomous_combat_recovery_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_live_autonomous_combat_recovery_session_state'),
    AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: buildSessionPersistPath('ai_player_live_autonomous_combat_recovery_provider_account_state'),
    AI_PLAYER_RUNTIME_MODEL_DISPATCH_STORE_PATH: buildSessionPersistPath('ai_player_live_autonomous_combat_recovery_model_dispatch_state'),
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
      reason: 'live_autonomous_combat_recovery_gate',
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
      displayName: '战损整补参谋',
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      actionWhitelist: ['troop_heal'],
      runtimePolicy: {
        allowRuleProposals: true,
        allowLlmProposals: true,
      },
    })
    pushCheck(checks, 'ai_player_registered_with_recovery_only_whitelist', register.status === 200, { status: register.status })
    assert.equal(register.status, 200, `register failed: ${JSON.stringify(register.data)}`)

    const runResponse = await requestJson(
      baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/run`,
      'POST',
      {
        maxSteps: RECOVERY_CHAIN_STEPS,
        limit: 6,
        plannerMode: 'llm',
      },
      240_000,
    )
    pushCheck(checks, 'live_llm_recovery_run_status_200', runResponse.status === 200, { status: runResponse.status })
    assert.equal(runResponse.status, 200, `live autonomous combat recovery run failed: ${JSON.stringify(runResponse.data)}`)
    const runPayload = readObject(readObject(runResponse.data).run)
    const steps = readArray(runPayload.steps).map((item) => readObject(item))
    const decisions = steps.map((step) => readObject(step.plannerDecision))
    const receipts = steps.map((step) => readObject(step.receipt))
    summary.stepCount = runPayload.stepCount
    summary.plannerSources = decisions.map((decision) => decision.plannerSource)
    summary.plannerModels = [...new Set(decisions.map((decision) => decision.model))]
    summary.selectedActions = steps.map((step) => step.selectedAction)
    summary.receiptWorldActions = receipts.map((receipt) => receipt.worldAction)
    summary.naturalLanguageResults = steps.map((step) => step.naturalLanguageResult)
    pushCheck(checks, 'live_llm_recovery_chain_step_count', steps.length === RECOVERY_CHAIN_STEPS, { stepCount: steps.length })
    assert.equal(steps.length, RECOVERY_CHAIN_STEPS)
    pushCheck(checks, 'planner_source_llm_for_recovery_chain', decisions.every((decision) => decision.plannerSource === 'llm'), {
      plannerSources: summary.plannerSources,
      models: summary.plannerModels,
    })
    assert.ok(decisions.every((decision) => decision.plannerSource === 'llm'))
    pushCheck(checks, 'selected_action_troop_heal_recovery_chain', steps.every((step) => step.selectedAction === 'troop_heal'), {
      selectedActions: summary.selectedActions,
    })
    assert.ok(steps.every((step) => step.selectedAction === 'troop_heal'))
    pushCheck(checks, 'executor_receipt_heal_troop_recovery_chain_success', receipts.every((receipt) => receipt.ok === true && receipt.worldAction === 'healTroop'), {
      receiptWorldActions: summary.receiptWorldActions,
    })
    assert.ok(receipts.every((receipt) => receipt.ok === true && receipt.worldAction === 'healTroop'))

    const personalReports = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/personal-reports?limit=5`, 'GET')
    assert.equal(personalReports.status, 200, `combat personal reports failed: ${JSON.stringify(personalReports.data)}`)
    const personalReportItems = readArray(readObject(personalReports.data).items).map((item) => readObject(item))
    const latestPersonalReport = personalReportItems[0]
    const playerFacingPayload = JSON.stringify(latestPersonalReport)
    summary.personalReportCount = personalReportItems.length
    summary.personalReportCategory = latestPersonalReport?.category
    pushCheck(checks, 'backend_combat_personal_report_is_natural_language', personalReportItems.length >= RECOVERY_CHAIN_STEPS && latestPersonalReport?.category === 'combat' && latestPersonalReport?.action === 'troop_heal', {
      count: personalReportItems.length,
      category: latestPersonalReport?.category,
      action: latestPersonalReport?.action,
    })
    assert.ok(personalReportItems.length >= RECOVERY_CHAIN_STEPS)
    assert.equal(latestPersonalReport?.category, 'combat')
    assert.equal(latestPersonalReport?.action, 'troop_heal')
    assert.doesNotMatch(playerFacingPayload, /proposalId|worldAction|MCP|tool|approve|execute|JSON/)

    const playerReports = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/player-reports?limit=5`, 'GET')
    assert.equal(playerReports.status, 200, `combat player reports failed: ${JSON.stringify(playerReports.data)}`)
    const playerReportItems = readArray(readObject(playerReports.data).items).map((item) => readObject(item))
    const combatReportCount = playerReportItems.filter((item) => item.itemKind === 'ai_autonomous_combat' && item.action === 'troop_heal').length
    summary.playerReportCount = playerReportItems.length
    pushCheck(checks, 'player_reports_include_recovery_chain_results', combatReportCount >= RECOVERY_CHAIN_STEPS, { count: playerReportItems.length, combatReportCount })
    assert.ok(combatReportCount >= RECOVERY_CHAIN_STEPS, 'player reports should include autonomous combat recovery chain results')

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

    const report = writeReport({
      ok: true,
      status: 'pass',
      ...reportBase,
    })
    console.log(`[AI Player Live Autonomous Combat Recovery Gate] ok=true steps=${String(steps.length)} actions=${String(summary.selectedActions)} latest=${LATEST_REPORT_PATH}`)
    return report
  } catch (error) {
    const report = writeReport({
      ok: false,
      status: 'fail',
      ...reportBase,
      failure: {
        ...sanitizeError(error),
        backendStdoutTail: tail.stdout,
        backendStderrTail: tail.stderr,
      },
    })
    void report
    throw error
  } finally {
    await shutdownChild(child)
  }
}

if (process.argv[1]?.endsWith('runAiPlayerLiveAutonomousCombatRecoveryGate.ts')) {
  runGate().catch((error) => {
    console.error(`[AI Player Live Autonomous Combat Recovery Gate] failed: ${sanitizeError(error).message}`)
    process.exitCode = 1
  })
}
