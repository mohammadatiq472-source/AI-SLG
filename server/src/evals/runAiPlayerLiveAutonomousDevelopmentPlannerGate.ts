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

const AI_PLAYER_ID = 'live_autonomous_development_ai'
const FACTION_ID = 'player'
const GOVERNOR_PLAYER_ID = 'human_live_autonomous_gate'
const SECRET_ENV_NAME = 'AI_PLAYER_RUNTIME_MODEL_API_KEY'
const LATEST_REPORT_PATH = join(process.cwd(), 'tmp', 'gates', 'ai_player_live_autonomous_development_planner_gate_latest.json')

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

function seedWorldStateWithSingleSafeTileOccupyTarget() {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding live autonomous development gate`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding live autonomous development gate`)
  const tile = world.map.tiles.find((candidate) => candidate.id === unit.tileId) ?? world.map.tiles[0]
  assert.ok(tile, 'missing current tile while seeding live autonomous development gate')

  tile.name = '青州近郊木场'
  tile.type = 'resource'
  tile.owner = 'neutral'
  tile.enemyPressure = 0
  tile.resourceKind = 'wood'
  tile.resourceLevel = 1

  unit.tileId = tile.id
  unit.status = '待命'
  unit.currentTask = undefined
  unit.strength = Math.max(unit.strength, 120)
  unit.mobility = Math.max(unit.mobility, 100)
  unit.supply = Math.max(unit.supply, 100)

  faction.actionPoints = 100
  faction.food = Math.max(faction.food ?? 0, 100)
  faction.wood = Math.max(faction.wood ?? 0, 100)
  faction.stone = Math.max(faction.stone ?? 0, 100)
  faction.iron = Math.max(faction.iron ?? 0, 100)
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: '青州开荒官',
      factionId: FACTION_ID,
      unitIds: [unit.id],
      specialty: 'expansion',
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

  const path = buildSessionPersistPath('ai_player_live_autonomous_development_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    path,
    unitId: unit.id,
    tileId: tile.id,
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
  const seeded = seedWorldStateWithSingleSafeTileOccupyTarget()
  const governanceStatePath = buildSessionPersistPath('ai_player_live_autonomous_development_governance_state')
  const sessionStatePath = buildSessionPersistPath('ai_player_live_autonomous_development_session_state')
  const providerAccountStatePath = buildSessionPersistPath('ai_player_live_autonomous_development_provider_account_state')
  const modelDispatchStatePath = buildSessionPersistPath('ai_player_live_autonomous_development_model_dispatch_state')
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: seeded.path,
    AI_PLAYER_GOVERNANCE_STATE_PATH: governanceStatePath,
    SESSION_STATE_PERSIST_PATH: sessionStatePath,
    AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: providerAccountStatePath,
    AI_PLAYER_RUNTIME_MODEL_DISPATCH_STORE_PATH: modelDispatchStatePath,
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
      reason: 'live_autonomous_development_planner_gate',
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
      displayName: '青州开荒官',
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      actionWhitelist: ['tile_occupy'],
      runtimePolicy: {
        allowRuleProposals: true,
        allowLlmProposals: true,
      },
    })
    pushCheck(checks, 'ai_player_registered', register.status === 200, { status: register.status })
    assert.equal(register.status, 200, `register failed: ${JSON.stringify(register.data)}`)

    const runResponse = await requestJson(
      baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/run`,
      'POST',
      {
        maxSteps: 1,
        plannerMode: 'llm',
        goalPower: 4000,
        triggeredBy: 'live_autonomous_development_planner_gate',
      },
      120_000,
    )
    pushCheck(checks, 'live_llm_autonomous_run_status_200', runResponse.status === 200, { status: runResponse.status })
    assert.equal(runResponse.status, 200, `live autonomous planner run failed: ${JSON.stringify(runResponse.data)}`)
    const runPayload = readObject(readObject(runResponse.data).run)
    const step = readObject(readArray(runPayload.steps)[0])
    const decision = readObject(step.plannerDecision)
    const receipt = readObject(step.receipt)
    summary.runId = runPayload.runId
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
    pushCheck(checks, 'selected_action_tile_occupy', step.selectedAction === 'tile_occupy', { selectedAction: step.selectedAction })
    assert.equal(step.selectedAction, 'tile_occupy')
    pushCheck(checks, 'executor_receipt_success', receipt.ok === true, { worldAction: receipt.worldAction, failureCode: receipt.failureCode })
    assert.equal(receipt.ok, true)

    const proposals = await requestJson(baseUrl, `/api/ai/players/proposals?aiPlayerId=${AI_PLAYER_ID}&limit=10`, 'GET')
    assert.equal(proposals.status, 200, `proposal list failed: ${JSON.stringify(proposals.data)}`)
    const proposalItems = readArray(readObject(proposals.data).items).map((item) => readObject(item))
    const createdProposal = proposalItems.find((item) => item.proposalId === step.proposalId)
    summary.proposalSource = createdProposal?.source
    pushCheck(checks, 'proposal_source_llm', createdProposal?.source === 'llm', { source: createdProposal?.source })
    assert.equal(createdProposal?.source, 'llm')

    const playerReports = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/player-reports?limit=5`, 'GET')
    assert.equal(playerReports.status, 200, `player reports failed: ${JSON.stringify(playerReports.data)}`)
    const playerReportItems = readArray(readObject(playerReports.data).items).map((item) => readObject(item))
    const hasAutonomousReport = playerReportItems.some((item) => item.itemKind === 'ai_autonomous_development')
    summary.playerReportCount = playerReportItems.length
    pushCheck(checks, 'player_reports_include_autonomous_result', hasAutonomousReport, { count: playerReportItems.length })
    assert.ok(hasAutonomousReport, 'player reports should include autonomous development result')

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

    const ledger = await requestJson(baseUrl, `/api/ai/provider/billing-ledger?aiPlayerId=${AI_PLAYER_ID}&limit=5`, 'GET')
    assert.equal(ledger.status, 200, `billing ledger failed: ${JSON.stringify(ledger.data)}`)
    const ledgerItems = readArray(readObject(ledger.data).items).map((item) => readObject(item))
    summary.billingLedgerCount = ledgerItems.length
    pushCheck(checks, 'billing_ledger_records_live_planner_call', ledgerItems.length >= 1, { count: ledgerItems.length })
    assert.ok(ledgerItems.length >= 1, 'billing ledger should record live autonomous planner model call')

    writeReport({
      ok: true,
      status: 'pass',
      ...reportBase,
    })
    console.log(`[AI Player Live Autonomous Development Planner Gate] ok=true action=${String(step.selectedAction)} receiptWorldAction=${String(receipt.worldAction)} latest=${LATEST_REPORT_PATH}`)
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
  console.error(`[AI Player Live Autonomous Development Planner Gate] failed: ${sanitizeError(error).message}`)
  process.exitCode = 1
})
