import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type Server } from 'node:http'
import { dirname, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { createInitialWorldState } from '../../../shared/domain/scenario'
import { DEFAULT_AI_PLAYER_RUNTIME_MODEL } from '../application/ai/aiPlayerRuntimeModelTarget'
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
import { buildSessionPersistPath, getAvailablePort, readArray, readObject, requestJson } from '../../tests/helpers/backendHarness'

type TimedDriftGateReport = {
  ok: boolean
  status: 'pass' | 'fail'
  generatedAt: string
  gate: 'gate:ai:autonomous-development-drift:smoke' | 'gate:ai:autonomous-development-drift:30m'
  mode: 'llm_mock_provider'
  durationLimitMs: number
  durationMs: number
  chunkSteps: number
  minSteps: number
  stopReason: 'duration_elapsed' | 'max_total_steps_reached' | 'failed'
  totalSteps: number
  runCount: number
  actionCounts: Record<string, number>
  receiptFailureCount: number
  failureRate: number
  provider: {
    model: string
    defaultModel: string
    requestCount: number
    selectedActionCounts: Record<string, number>
  }
  progress: {
    chainTileCount: number
    occupiedChainTileCount: number
    gatheredChainTileCount: number
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
  risks: string[]
  diagnostics?: {
    providerRequestOverhead: number
    lastStepSummaries: StepSummary[]
    recentProviderInteractions?: MockProviderInteraction[]
    backendStdoutTail?: string[]
    backendStderrTail?: string[]
  }
  reportPath?: string
  stampedReportPath?: string
  failure?: {
    name: string
    message: string
    stackHead?: string[]
  }
}

type StepSummary = {
  order: number
  selectedAction: string
  receiptOk: boolean
  plannerSource: string
  model: string
  personalReportSummary?: string
}

type SeededTimedDriftWorld = {
  path: string
  unitId: string
  chainTileIds: string[]
}

type MockProviderStats = {
  requestCount: number
  selectedActionCounts: Record<string, number>
  recentInteractions: MockProviderInteraction[]
}

type MockProviderInteraction = {
  requestNumber: number
  requestKind: 'observation' | 'correction' | 'unknown'
  requestBytes: number
  selectedAction?: string
  responseContentPrefix: string
  responseContentStartsWithObject: boolean
}

const GATE_NAME = readDurationMs() >= 1_800_000
  ? 'gate:ai:autonomous-development-drift:30m'
  : 'gate:ai:autonomous-development-drift:smoke'
const DURATION_LIMIT_MS = readDurationMs()
const CHUNK_STEPS = readBoundedIntArg('--chunk-steps', 20, 1, 500)
const MIN_STEPS = readBoundedIntArg('--min-steps', GATE_NAME === 'gate:ai:autonomous-development-drift:30m' ? 300 : 10, 1, 10_000)
const MAX_TOTAL_STEPS = readBoundedIntArg('--max-total-steps', GATE_NAME === 'gate:ai:autonomous-development-drift:30m' ? 100_000 : 2_000, 1, 100_000)
const LOOP_DELAY_MS = readBoundedIntArg('--loop-delay-ms', 0, 0, 60_000)
const LONG_RUN_CHAIN_LENGTH = 900
const LONG_RUN_CHAIN_ROW_WIDTH = 320
const REPORT_PATH = join(
  process.cwd(),
  'tmp',
  'gates',
  GATE_NAME === 'gate:ai:autonomous-development-drift:30m'
    ? 'ai_autonomous_development_drift_30m_latest.json'
    : 'ai_autonomous_development_drift_smoke_latest.json',
)
const MOCK_PROVIDER_MODEL = 'mock-autonomous-development-provider'
const PERSONAL_REPORT_ROUTE_LIMIT = 200
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
const MOCK_PROVIDER_ACTION_PRIORITY = [
  'resource_gather',
  'tile_occupy',
  'march_move',
  'troop_heal',
  'troop_train',
  'queue_fill_idle_slot',
  'tactical_skill_upgrade',
  'building_upgrade',
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

function sanitizeError(error: unknown): TimedDriftGateReport['failure'] {
  const normalized = error instanceof Error ? error : new Error(String(error))
  return {
    name: normalized.name,
    message: normalized.message,
    stackHead: normalized.stack?.split(/\r?\n/).slice(0, 8),
  }
}

function writeReport(report: TimedDriftGateReport) {
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

function incrementCount(counts: Record<string, number>, key: string) {
  counts[key] = (counts[key] ?? 0) + 1
}

function rememberLastStepSummary(summaries: StepSummary[], summary: StepSummary) {
  summaries.push(summary)
  while (summaries.length > 8) {
    summaries.shift()
  }
}

function rememberProviderInteraction(
  interactions: MockProviderInteraction[],
  interaction: MockProviderInteraction,
) {
  interactions.push(interaction)
  while (interactions.length > 12) {
    interactions.shift()
  }
}

function assertPlayerLanguage(value: unknown, label: string) {
  assert.equal(typeof value, 'string', `${label} should be string`)
  const text = String(value)
  assert.ok(text.trim().length >= 6, `${label} should be non-empty player-facing language`)
  for (const forbidden of ['proposal', 'worldAction', 'MCP', 'tool', 'JSON', 'approve', 'execute']) {
    assert.equal(text.includes(forbidden), false, `${label} should not leak engineering wording: ${forbidden}`)
  }
}

function seedTimedDriftWorld(): SeededTimedDriftWorld {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding timed drift autonomous development gate`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding timed drift autonomous development gate`)

  const chainTileIds = Array.from({ length: LONG_RUN_CHAIN_LENGTH }, (_item, index) => {
    const row = Math.floor(index / LONG_RUN_CHAIN_ROW_WIDTH)
    const offset = index % LONG_RUN_CHAIN_ROW_WIDTH
    const x = row % 2 === 0 ? offset : LONG_RUN_CHAIN_ROW_WIDTH - 1 - offset
    return `grid_${x}_${row}`
  })
  const tileById = new Map(world.map.tiles.map((tile) => [tile.id, tile] as const))
  for (const tileId of chainTileIds) {
    assert.ok(tileById.has(tileId), `missing timed drift chain tile: ${tileId}`)
  }

  const resourceKinds = ['wood', 'stone', 'iron', 'food', 'copper'] as const
  for (let index = 0; index < chainTileIds.length; index += 1) {
    const tileId = chainTileIds[index]
    const tile = tileById.get(tileId)
    assert.ok(tile, `missing timed drift tile ${tileId}`)
    tile.name = `AI Timed Drift Chain ${String(index + 1).padStart(2, '0')}`
    tile.type = 'resource'
    tile.terrain = 'grassland'
    tile.owner = index === 0 ? FACTION_ID : 'neutral'
    tile.enemyPressure = 0
    tile.scoutingDifficulty = 1
    tile.resourceKind = resourceKinds[index % resourceKinds.length]
    tile.resourceLevel = 1
    tile.moveCost = 1
    tile.district = 'ai_autonomous_timed_drift_gate'
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
  unit.mobility = 500
  unit.supply = 9
  unit.aiPlayerId = AI_PLAYER_ID

  faction.actionPoints = 100000
  faction.food = 100000
  faction.wood = 100000
  faction.stone = 100000
  faction.iron = 100000
  faction.copper = 100000
  faction.heroCommand.developmentPoints = Math.max(faction.heroCommand.developmentPoints ?? 0, 100000)
  faction.heroCommand.commandLimit = Math.max(faction.heroCommand.commandLimit, world.units.filter((candidate) => candidate.faction === FACTION_ID).length + 3)
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
      id: 'ai_autonomous_timed_drift_seeded_first_tile_claim',
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

  const path = buildSessionPersistPath(`ai_player_autonomous_development_timed_drift_${DURATION_LIMIT_MS}_world_state`)
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    path,
    unitId: unit.id,
    chainTileIds,
  }
}

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

function parseLastUserObservation(body: Record<string, unknown>) {
  const messages = Array.isArray(body.messages) ? body.messages : []
  const userMessage = [...messages].reverse().find((message) => (
    message
    && typeof message === 'object'
    && (message as { role?: unknown }).role === 'user'
    && typeof (message as { content?: unknown }).content === 'string'
  )) as { content: string } | undefined
  if (!userMessage) {
    return null
  }
  try {
    return JSON.parse(userMessage.content) as Record<string, unknown>
  } catch {
    return null
  }
}

function classifyLastUserMessage(body: Record<string, unknown>): MockProviderInteraction['requestKind'] {
  const messages = Array.isArray(body.messages) ? body.messages : []
  const userMessage = [...messages].reverse().find((message) => (
    message
    && typeof message === 'object'
    && (message as { role?: unknown }).role === 'user'
    && typeof (message as { content?: unknown }).content === 'string'
  )) as { content: string } | undefined
  if (!userMessage) {
    return 'unknown'
  }
  try {
    const parsed = JSON.parse(userMessage.content) as Record<string, unknown>
    if (parsed.world && typeof parsed.world === 'object') {
      return 'observation'
    }
    if (parsed.correction || parsed.required || parsed.hardRequirement) {
      return 'correction'
    }
  } catch {
    return 'unknown'
  }
  return 'unknown'
}

function chooseMockProviderProposal(observationEnvelope: Record<string, unknown> | null) {
  const world = observationEnvelope?.world
  const developmentPlan = world && typeof world === 'object'
    ? (world as { developmentPlan?: unknown }).developmentPlan
    : null
  const units = world && typeof world === 'object' && Array.isArray((world as { units?: unknown }).units)
    ? ((world as { units: unknown[] }).units.filter((unit): unit is Record<string, unknown> => Boolean(unit && typeof unit === 'object')))
    : []
  const candidateActions = developmentPlan && typeof developmentPlan === 'object'
    ? (developmentPlan as { candidateActions?: unknown }).candidateActions
    : []
  const candidates = Array.isArray(candidateActions)
    ? candidateActions.filter((candidate): candidate is Record<string, unknown> => Boolean(candidate && typeof candidate === 'object'))
    : []
  const recoveryCandidate = candidates.find((item) => (
    item.action === 'troop_heal'
    && item.executableInV1 === true
    && item.readiness === 'ready'
    && Boolean(item.proposalArgs ?? item.args)
  ))
  const shouldRecover = units.some((unit) => (
    Number(unit.supply ?? 100) <= 2
    || Number(unit.strength ?? 100) <= 55
  ))
  if (recoveryCandidate && shouldRecover) {
    return {
      action: 'troop_heal',
      args: (recoveryCandidate.proposalArgs ?? recoveryCandidate.args) as Record<string, unknown>,
      reason: typeof recoveryCandidate.proposalReason === 'string'
        ? recoveryCandidate.proposalReason
        : '资源：保留行动点和粮草；目标：整补低状态部队；风险：避免继续硬推；批准后结果：恢复兵力和补给。',
    }
  }

  for (const action of MOCK_PROVIDER_ACTION_PRIORITY) {
    const candidate = candidates.find((item) => (
      item.action === action
      && item.executableInV1 === true
      && item.readiness === 'ready'
      && Boolean(item.proposalArgs ?? item.args)
    ))
    if (!candidate) {
      continue
    }
    return {
      action,
      args: (candidate.proposalArgs ?? candidate.args) as Record<string, unknown>,
      reason: typeof candidate.proposalReason === 'string'
        ? candidate.proposalReason
        : `资源：读取当前局势；目标：执行 ${action}；风险：由后端校验；批准后结果：写入自然语言战果。`,
    }
  }

  return null
}

async function startMockProvider() {
  const port = await getAvailablePort()
  const stats: MockProviderStats = {
    requestCount: 0,
    selectedActionCounts: {},
    recentInteractions: [],
  }
  const server = createServer(async (req, res) => {
    if (req.method !== 'POST' || (req.url !== '/chat/completions' && req.url !== '/v1/chat/completions')) {
      res.statusCode = 404
      res.end(JSON.stringify({ error: 'not_found' }))
      return
    }
    stats.requestCount += 1
    try {
      const rawBody = await readRequestBody(req)
      const body = JSON.parse(rawBody) as Record<string, unknown>
      const requestKind = classifyLastUserMessage(body)
      const observationEnvelope = parseLastUserObservation(body)
      const proposal = chooseMockProviderProposal(observationEnvelope)
      if (!proposal) {
        const responseContent = JSON.stringify({
          summary: 'mock provider found no ready action',
          proposals: [],
          deferReason: 'no ready governed action',
          needsHumanReview: false,
        })
        rememberProviderInteraction(stats.recentInteractions, {
          requestNumber: stats.requestCount,
          requestKind,
          requestBytes: Buffer.byteLength(rawBody, 'utf-8'),
          responseContentPrefix: responseContent.slice(0, 160),
          responseContentStartsWithObject: responseContent.trim().startsWith('{'),
        })
        res.statusCode = 200
        writeJsonResponse(res, {
          model: MOCK_PROVIDER_MODEL,
          choices: [
            {
              message: {
                role: 'assistant',
                content: responseContent,
              },
            },
          ],
          usage: {
            prompt_tokens: 512,
            completion_tokens: 48,
            total_tokens: 560,
          },
        })
        return
      }
      stats.selectedActionCounts[proposal.action] = (stats.selectedActionCounts[proposal.action] ?? 0) + 1
      const responseContent = JSON.stringify({
        summary: `mock provider selected ${proposal.action}`,
        proposals: [proposal],
        deferReason: '',
        needsHumanReview: false,
      })
      rememberProviderInteraction(stats.recentInteractions, {
        requestNumber: stats.requestCount,
        requestKind,
        requestBytes: Buffer.byteLength(rawBody, 'utf-8'),
        selectedAction: proposal.action,
        responseContentPrefix: responseContent.slice(0, 160),
        responseContentStartsWithObject: responseContent.trim().startsWith('{'),
      })
      writeJsonResponse(res, {
        model: MOCK_PROVIDER_MODEL,
        choices: [
          {
            message: {
              role: 'assistant',
              content: responseContent,
            },
          },
        ],
        usage: {
          prompt_tokens: 512,
          completion_tokens: 80,
          total_tokens: 592,
        },
      })
    } catch (error) {
      res.statusCode = 500
      writeJsonResponse(res, { error: error instanceof Error ? error.message : String(error) })
    }
  })
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    stats,
    stop: () => stopServer(server),
  }
}

function writeJsonResponse(res: { setHeader: (name: string, value: string) => void; end: (payload: string) => void }, payload: unknown) {
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function stopServer(server: Server) {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

async function bootTimedDriftBackend(
  worldPersistPath: string,
  providerBaseUrl: string,
  persistPaths?: Partial<AiPlayerHttpPersistPaths>,
): Promise<AiPlayerHttpBackend> {
  const backend = await startAiPlayerHttpBackend(
    `ai_player_autonomous_development_timed_drift_${DURATION_LIMIT_MS}_gate`,
    persistPaths,
    {
      WORLD_STATE_PERSIST_PATH: worldPersistPath,
      ENABLE_FULL_MAP_LAYOUT: '1',
      AI_PLAYER_RUNTIME_MODEL_BASE_URL: providerBaseUrl,
      AI_PLAYER_RUNTIME_MODEL_API_KEY: 'mock-provider-key',
      AI_PLAYER_RUNTIME_MODEL: MOCK_PROVIDER_MODEL,
      AI_PLAYER_AUTONOMOUS_DEVELOPMENT_MODEL_MOCK_OUTPUT: '',
      AI_PLAYER_PROVIDER_BUDGET_WINDOW_MS: String(Math.max(DURATION_LIMIT_MS, 86_400_000)),
      AI_PLAYER_PROVIDER_BUDGET_MAX_RUNS_PER_WINDOW: '100000',
      AI_PLAYER_PROVIDER_BUDGET_MAX_TOTAL_TOKENS_PER_WINDOW: '100000000',
      AI_PLAYER_PROVIDER_BUDGET_MAX_COST_USD_PER_WINDOW: '1000',
      AI_PLAYER_RUNTIME_MODEL_MAX_CONCURRENCY: '1',
      AI_PLAYER_RUNTIME_MODEL_QUEUE_LIMIT: '128',
      AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_REQUESTS: '100000',
      AI_PLAYER_RUNTIME_MODEL_RATE_BUCKET_WINDOW_MS: String(Math.max(DURATION_LIMIT_MS, 60_000)),
      AI_PLAYER_RUNTIME_MODEL_DISPATCH_STORE_PATH: buildSessionPersistPath(`ai_player_autonomous_development_timed_drift_${DURATION_LIMIT_MS}_model_dispatch_state`),
      AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: buildSessionPersistPath(`ai_player_autonomous_development_timed_drift_${DURATION_LIMIT_MS}_provider_account_state`),
    },
  )
  await joinGovernor(backend.baseUrl)
  const grant = await requestJson(backend.baseUrl, '/api/ai/provider/ai-command-credits/grants', 'POST', {
    accountId: GOVERNOR_PLAYER_ID,
    worldId: FACTION_ID,
    amountCredits: 1_000_000,
    reason: 'autonomous_development_timed_drift_gate',
  })
  assert.equal(grant.status, 200, `credit grant failed: ${JSON.stringify(grant.data)}`)
  const register = await requestJson(backend.baseUrl, '/api/ai/players', 'POST', {
    aiPlayerId: AI_PLAYER_ID,
    displayName: 'Player Operator Alpha',
    governorPlayerId: GOVERNOR_PLAYER_ID,
    factionId: FACTION_ID,
    actionWhitelist: AUTONOMOUS_ACTION_WHITELIST,
    runtimePolicy: {
      allowRuleProposals: true,
      allowLlmProposals: true,
    },
  })
  assert.equal(register.status, 200, `register timed drift AI player failed: ${JSON.stringify(register.data)}`)
  return backend
}

function buildRiskList(params: {
  totalSteps: number
  actionCounts: Record<string, number>
  routePersonalReports: number
  runPersonalReports: number
  occupiedChainTileCount: number
  gatheredChainTileCount: number
  providerRequestOverhead: number
}) {
  const risks: string[] = []
  const productiveSteps = (params.actionCounts.tile_occupy ?? 0) + (params.actionCounts.resource_gather ?? 0)
  const productiveRatio = params.totalSteps > 0 ? productiveSteps / params.totalSteps : 0
  if (productiveRatio < 0.35) {
    risks.push('low_productive_step_ratio_after_chain_completion')
  }
  if (params.routePersonalReports < params.runPersonalReports) {
    risks.push('personal_report_route_returns_latest_200_not_full_long_run')
  }
  if (params.occupiedChainTileCount >= LONG_RUN_CHAIN_LENGTH && params.gatheredChainTileCount >= LONG_RUN_CHAIN_LENGTH) {
    risks.push('fixture_goal_exhausted_requires_real_goal_ladder_next')
  }
  if (params.providerRequestOverhead > 0) {
    risks.push('provider_requests_exceeded_committed_steps_during_run')
  }
  if (GATE_NAME === 'gate:ai:autonomous-development-drift:30m') {
    risks.push('long_run_observation_and_provider_store_growth_requires_live_soak')
  }
  risks.push('mock_provider_is_not_live_model_reasoning')
  risks.push('combat_and_enemy_strategy_not_covered')
  return risks
}

async function readTimedDriftProgress(
  backend: AiPlayerHttpBackend,
  seeded: SeededTimedDriftWorld,
): Promise<TimedDriftGateReport['progress']> {
  const worldAfter = await loadWorldState(backend.baseUrl)
  const factionAfter = worldAfter.factions[FACTION_ID]
  assert.ok(factionAfter, 'faction should exist after timed drift autonomous development run')
  const unitAfter = worldAfter.units.find((unit) => unit.id === seeded.unitId)
  const tileStates = (worldAfter.map as unknown as { tileStates?: Array<{ id: string; owner?: string }> }).tileStates ?? []
  const tileOwner = (tileId: string) => tileStates.find((tile) => tile.id === tileId)?.owner
    ?? worldAfter.map.tiles.find((tile) => tile.id === tileId)?.owner
  const occupiedChainTileCount = seeded.chainTileIds.filter((tileId) => tileOwner(tileId) === FACTION_ID).length
  const gatheredChainTileCount = seeded.chainTileIds
    .filter((tileId) => Boolean(factionAfter.aiResourceGatherClaims?.[tileId]))
    .length
  return {
    chainTileCount: seeded.chainTileIds.length,
    occupiedChainTileCount,
    gatheredChainTileCount,
    finalUnitTileId: unitAfter?.tileId,
    finalUnitStrength: unitAfter?.strength,
    finalUnitSupply: unitAfter?.supply,
  }
}

async function runGate() {
  const seeded = seedTimedDriftWorld()
  const provider = await startMockProvider()
  const backend = await bootTimedDriftBackend(seeded.path, provider.baseUrl)
  const startedAt = Date.now()
  const deadlineAt = startedAt + DURATION_LIMIT_MS
  const actionCounts: Record<string, number> = {}
  const lastStepSummaries: StepSummary[] = []
  let totalSteps = 0
  let receiptFailureCount = 0
  let runPersonalReportCount = 0
  let runCount = 0

  try {
    while ((Date.now() < deadlineAt || runCount === 0) && totalSteps < MAX_TOTAL_STEPS) {
      const maxSteps = Math.min(CHUNK_STEPS, MAX_TOTAL_STEPS - totalSteps)
      const runResponse = await requestJson(
        backend.baseUrl,
        `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/run`,
        'POST',
        {
          maxSteps,
          plannerMode: 'llm',
          goalPower: 12000,
          triggeredBy: `autonomous_development_timed_drift_${DURATION_LIMIT_MS}`,
        },
        Math.max(120_000, Math.min(900_000, DURATION_LIMIT_MS + 60_000)),
      )
      assert.equal(runResponse.status, 200, `timed drift autonomous development run failed: ${JSON.stringify(runResponse.data)}`)
      const runPayload = readObject(readObject(runResponse.data).run)
      const steps = readArray(runPayload.steps).map((item) => readObject(item))
      assert.ok(steps.length > 0, 'timed drift chunk should execute at least one step')
      for (const step of steps) {
        const plannerDecision = readObject(step.plannerDecision)
        assert.equal(plannerDecision.plannerSource, 'llm', 'timed drift gate must go through the LLM planner path')
        assert.equal(plannerDecision.model, MOCK_PROVIDER_MODEL, 'timed drift gate must use the local mock provider model')
        assertPlayerLanguage(step.naturalLanguageResult, 'timed drift naturalLanguageResult')
        const receipt = readObject(step.receipt)
        const report = readObject(step.personalReport)
        assertPlayerLanguage(report.summary, 'timed drift personal report summary')
        assertPlayerLanguage(report.result, 'timed drift personal report result')
        const selectedAction = String(step.selectedAction ?? 'unknown')
        incrementCount(actionCounts, selectedAction)
        if (receipt.ok !== true) {
          receiptFailureCount += 1
        }
        runPersonalReportCount += 1
        totalSteps += 1
        rememberLastStepSummary(lastStepSummaries, {
          order: totalSteps,
          selectedAction,
          receiptOk: receipt.ok === true,
          plannerSource: String(plannerDecision.plannerSource ?? ''),
          model: String(plannerDecision.model ?? ''),
          personalReportSummary: typeof report.summary === 'string' ? report.summary : undefined,
        })
      }
      runCount += 1
      if (LOOP_DELAY_MS > 0 && Date.now() < deadlineAt) {
        await delay(LOOP_DELAY_MS)
      }
    }

    const durationMs = Date.now() - startedAt
    const stopReason = totalSteps >= MAX_TOTAL_STEPS ? 'max_total_steps_reached' : 'duration_elapsed'
    const failureRate = totalSteps > 0 ? receiptFailureCount / totalSteps : 1
    const providerRequestOverhead = Math.max(0, provider.stats.requestCount - totalSteps)

    assert.ok(
      durationMs >= Math.min(DURATION_LIMIT_MS, 1_000) || totalSteps >= MIN_STEPS,
      'timed drift gate should run for the configured time window or reach the requested minimum step count',
    )
    if (GATE_NAME === 'gate:ai:autonomous-development-drift:30m') {
      assert.ok(durationMs >= DURATION_LIMIT_MS, '30m timed drift gate must run for the full configured duration')
      assert.equal(stopReason, 'duration_elapsed', '30m timed drift gate must stop because the duration elapsed')
    }
    assert.ok(totalSteps >= MIN_STEPS, `timed drift gate should execute at least ${MIN_STEPS} steps`)
    assert.equal(receiptFailureCount, 0, 'timed drift gate should have no failed executor receipts')
    assert.ok(provider.stats.requestCount >= totalSteps, 'mock provider should receive at least one request per LLM-planned step')
    if (totalSteps >= 3) {
      assert.ok((actionCounts.march_move ?? 0) >= 1, 'timed drift gate should include movement decisions')
      assert.ok((actionCounts.tile_occupy ?? 0) >= 1, 'timed drift gate should include occupation decisions')
      assert.ok((actionCounts.resource_gather ?? 0) >= 1, 'timed drift gate should include gathering decisions')
    }
    if (totalSteps >= 80) {
      assert.ok((actionCounts.troop_heal ?? 0) >= 1, 'timed drift gate should include sustainment recovery decisions')
    }

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
      Math.min(runPersonalReportCount, PERSONAL_REPORT_ROUTE_LIMIT),
      'personal reports route should expose latest persisted reports inside its route limit',
    )

    const playerReportsResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-development/player-reports?limit=${PERSONAL_REPORT_ROUTE_LIMIT}`,
      'GET',
      undefined,
      90_000,
    )
    assert.equal(playerReportsResponse.status, 200, `player reports route failed: ${JSON.stringify(playerReportsResponse.data)}`)
    const playerReports = readArray(readObject(playerReportsResponse.data).items).map((item) => readObject(item))
    const aiAutonomousPlayerReports = playerReports.filter((report) => report.itemKind === 'ai_autonomous_development')
    assert.ok(aiAutonomousPlayerReports.length >= 1, 'player report list should include AI autonomous reports')

    const progress = await readTimedDriftProgress(backend, seeded)
    if (totalSteps >= 10) {
      assert.ok(progress.occupiedChainTileCount >= 3, 'timed drift gate should occupy multiple fixture chain tiles')
      assert.ok(progress.gatheredChainTileCount >= 3, 'timed drift gate should gather multiple fixture chain tiles')
    }

    const risks = buildRiskList({
      totalSteps,
      actionCounts,
      routePersonalReports: personalReports.length,
      runPersonalReports: runPersonalReportCount,
      occupiedChainTileCount: progress.occupiedChainTileCount,
      gatheredChainTileCount: progress.gatheredChainTileCount,
      providerRequestOverhead,
    })
    writeReport({
      ok: true,
      status: 'pass',
      generatedAt: new Date().toISOString(),
      gate: GATE_NAME,
      mode: 'llm_mock_provider',
      durationLimitMs: DURATION_LIMIT_MS,
      durationMs,
      chunkSteps: CHUNK_STEPS,
      minSteps: MIN_STEPS,
      stopReason,
      totalSteps,
      runCount,
      actionCounts,
      receiptFailureCount,
      failureRate,
      provider: {
        model: MOCK_PROVIDER_MODEL,
        defaultModel: DEFAULT_AI_PLAYER_RUNTIME_MODEL,
        requestCount: provider.stats.requestCount,
        selectedActionCounts: provider.stats.selectedActionCounts,
      },
      progress,
      reportCounts: {
        runPersonalReports: runPersonalReportCount,
        personalReports: personalReports.length,
        playerReportItems: playerReports.length,
        aiAutonomousPlayerReports: aiAutonomousPlayerReports.length,
      },
      risks,
      diagnostics: {
        providerRequestOverhead,
        lastStepSummaries,
        recentProviderInteractions: provider.stats.recentInteractions,
        backendStdoutTail: backend.tail.stdout.slice(-8),
        backendStderrTail: backend.tail.stderr.slice(-8),
      },
    })
    console.log(`[ai_autonomous_development_timed_drift_gate] passed gate=${GATE_NAME} steps=${totalSteps} providerRequests=${provider.stats.requestCount} report=${REPORT_PATH}`)
  } catch (error) {
    let progress: TimedDriftGateReport['progress'] = {
      chainTileCount: seeded.chainTileIds.length,
      occupiedChainTileCount: 0,
      gatheredChainTileCount: 0,
    }
    try {
      progress = await readTimedDriftProgress(backend, seeded)
    } catch {
      // Keep the original failure as the gate result; progress readback is diagnostic only.
    }
    const providerRequestOverhead = Math.max(0, provider.stats.requestCount - totalSteps)
    writeReport({
      ok: false,
      status: 'fail',
      generatedAt: new Date().toISOString(),
      gate: GATE_NAME,
      mode: 'llm_mock_provider',
      durationLimitMs: DURATION_LIMIT_MS,
      durationMs: Date.now() - startedAt,
      chunkSteps: CHUNK_STEPS,
      minSteps: MIN_STEPS,
      stopReason: 'failed',
      totalSteps,
      runCount,
      actionCounts,
      receiptFailureCount,
      failureRate: totalSteps > 0 ? receiptFailureCount / totalSteps : 1,
      provider: {
        model: MOCK_PROVIDER_MODEL,
        defaultModel: DEFAULT_AI_PLAYER_RUNTIME_MODEL,
        requestCount: provider.stats.requestCount,
        selectedActionCounts: provider.stats.selectedActionCounts,
      },
      progress,
      reportCounts: {
        runPersonalReports: runPersonalReportCount,
        personalReports: 0,
        playerReportItems: 0,
        aiAutonomousPlayerReports: 0,
      },
      risks: [
        'timed_drift_gate_failed_before_duration_elapsed',
        ...(providerRequestOverhead > 0 ? ['provider_requests_exceeded_committed_steps_during_failed_chunk'] : []),
        'long_run_observation_and_provider_store_growth_requires_live_soak',
        'mock_provider_is_not_live_model_reasoning',
        'combat_and_enemy_strategy_not_covered',
      ],
      diagnostics: {
        providerRequestOverhead,
        lastStepSummaries,
        recentProviderInteractions: provider.stats.recentInteractions,
        backendStdoutTail: backend.tail.stdout.slice(-8),
        backendStderrTail: backend.tail.stderr.slice(-8),
      },
      failure: sanitizeError(error),
    })
    throw error
  } finally {
    await backend.stop()
    await provider.stop()
  }
}

runGate().catch((error) => {
  console.error(`[ai_autonomous_development_timed_drift_gate] failed:`, error)
  process.exitCode = 1
})
