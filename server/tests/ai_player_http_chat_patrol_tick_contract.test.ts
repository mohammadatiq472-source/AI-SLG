import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  aiPlayerProactivePatrolMessageMetadataSchema,
  aiPlayerChatPatrolSchedulerRunResponseSchema,
  aiPlayerChatPatrolTickResponseSchema,
} from '../../shared/schemas/aiPlayerChat'
import {
  AI_PLAYER_ID,
  FACTION_ID,
  GOVERNOR_PLAYER_ID,
  joinGovernor,
  loadWorldState,
  startAiPlayerHttpBackend,
  type AiPlayerHttpBackend,
} from './helpers/aiPlayerHttpContractHarness'
import { readArray, readObject, requestJson, sleep } from './helpers/backendHarness'
import { getAvailablePort } from './helpers/backendHarness'

const ACTIVE_SAMPLING_AI_PLAYER_ID = 'active_sampling_ai'

type PatrolTickSeed = {
  persistRoot: string
  unitId: string
  tileId: string
}

async function startPatrolRelayProbe(contentFactory: (callCount: number) => unknown | Promise<unknown> = () => JSON.stringify({
  summary: 'should not be called when provider budget is exhausted',
  proposals: [],
  deferReason: '',
  needsHumanReview: true,
})) {
  const port = await getAvailablePort()
  const probes: string[] = []
  const bodies: string[] = []
  const server = createServer((req, res) => {
    probes.push(String(req.url ?? ''))
    let body = ''
    req.on('data', (chunk) => {
      body += String(chunk)
    })
    req.on('end', () => {
      void (async () => {
      bodies.push(body)
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({
        model: 'patrol-budget-test-model',
        choices: [
          {
            message: {
              content: await contentFactory(probes.length),
            },
          },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }))
      })().catch((error: unknown) => {
        res.writeHead(500, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }))
      })
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve())
  })
  return {
    baseUrl: `http://127.0.0.1:${port}/v1`,
    probes,
    bodies,
    stop: () => new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve()
      })
    }),
  }
}

function seedPatrolTickWorld(): PatrolTickSeed {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding patrol tick shard`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding patrol tick shard`)
  const targetTile = world.map.tiles.find((tile) => tile.type !== 'city' && tile.type !== 'fog')
    ?? world.map.tiles[0]
  assert.ok(targetTile, 'missing target tile while seeding patrol tick shard')

  targetTile.type = 'resource'
  targetTile.owner = 'neutral'
  targetTile.resourceKind = targetTile.resourceKind || 'wood'
  targetTile.resourceLevel = Math.max(1, targetTile.resourceLevel ?? 2)
  targetTile.enemyPressure = 2

  unit.tileId = targetTile.id
  unit.strength = 68
  unit.supply = 4
  unit.currentTask = undefined
  unit.aiPlayerId = AI_PLAYER_ID

  faction.actionPoints = Math.max(faction.actionPoints, 8)
  faction.food = Math.max(faction.food, 12)
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: 'Patrol Operator Alpha',
      factionId: FACTION_ID,
      unitIds: [unit.id],
      specialty: 'recon',
    },
  ]

  world.tick = 44
  world.feedback.battleRecords = [
    {
      id: 'patrol_tick_ai_loss_latest',
      tick: 43,
      regionId: 'patrol_tick_front',
      tileId: targetTile.id,
      attackerFaction: FACTION_ID,
      attackerUnitId: unit.id,
      outcome: 'loss',
      attackerLoss: 36,
      defenderLoss: 12,
      alliedSupport: 0,
      summary: 'AI patrol should read this latest battle report before proposing next steps.',
    },
  ]

  const persistRoot = join(process.cwd(), 'tmp', `ai_player_http_chat_patrol_tick_world_${process.pid}_${Date.now()}`)
  const path = join(persistRoot, 'world_snapshot.json')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    persistRoot,
    unitId: unit.id,
    tileId: targetTile.id,
  }
}

async function bootPatrolTickBackend(
  worldPersistRoot: string,
  envOverrides: NodeJS.ProcessEnv = {},
  playerOverrides: Record<string, unknown> = {},
): Promise<AiPlayerHttpBackend> {
  const backend = await startAiPlayerHttpBackend(
    'ai_player_http_chat_patrol_tick_contract',
    undefined,
    {
      WORLD_PERSIST_ROOT: worldPersistRoot,
      ...envOverrides,
    },
  )
  await joinGovernor(backend.baseUrl)
  const register = await requestJson(backend.baseUrl, '/api/ai/players', 'POST', {
    aiPlayerId: AI_PLAYER_ID,
    displayName: 'Patrol Operator Alpha',
    governorPlayerId: GOVERNOR_PLAYER_ID,
    factionId: FACTION_ID,
    actionWhitelist: ['battle_report_read', 'troop_heal', 'tile_occupy', 'march_move', 'resource_gather'],
    budgetPolicy: {
      allowHighRiskActions: true,
    },
    ...playerOverrides,
  })
  assert.equal(register.status, 200, `register patrol tick AI player failed: ${JSON.stringify(register.data)}`)
  return backend
}

async function grantPatrolAiCommandCredits(backend: AiPlayerHttpBackend, reason: string) {
  const granted = await requestJson(backend.baseUrl, '/api/ai/provider/ai-command-credits/grants', 'POST', {
    accountId: GOVERNOR_PLAYER_ID,
    worldId: FACTION_ID,
    amountCredits: 100,
    reason,
  })
  assert.equal(granted.status, 200, `grant patrol AI command credits failed: ${JSON.stringify(granted.data)}`)
  assert.equal(readObject(granted.data).ok, true)
}

async function upsertPatrolIdentityAddressing(backend: AiPlayerHttpBackend) {
  const upsertIdentity = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/context-documents`, 'POST', {
    documentId: 'identity_proactive_addressing_test',
    kind: 'identity',
    title: '巡查身份文件',
    content: '玩家称呼：主公。语气：稳重，先报风险，再等待批准。',
    sourceFileName: 'proactive-identity.txt',
    updatedBy: GOVERNOR_PLAYER_ID,
  })
  assert.equal(upsertIdentity.status, 200, `proactive identity upsert failed: ${JSON.stringify(upsertIdentity.data)}`)
}

async function testPatrolSchedulerCoalescesInFlightIdempotencyKey() {
  const seeded = seedPatrolTickWorld()
  const relay = await startPatrolRelayProbe(async () => {
    await sleep(80)
    return JSON.stringify({
      summary: 'coalesced scheduler patrol chose the candidate resource tile',
      proposals: [
        {
          action: 'tile_occupy',
          args: {
            unitId: seeded.unitId,
            tileId: seeded.tileId,
          },
          reason: '资源：目标资源地可占；目标：派当前 AI 部队占领该地块；风险：需要总督批准且后端会校验地块/部队；批准后结果：后端执行占地并生成 receipt。',
        },
      ],
      deferReason: '',
      needsHumanReview: true,
    })
  })
  const backend = await bootPatrolTickBackend(seeded.persistRoot, {
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: relay.baseUrl,
    AI_PLAYER_RUNTIME_MODEL_API_KEY: 'patrol-inflight-key-fixture',
    AI_PLAYER_RUNTIME_MODEL: 'patrol/strict-json-model',
    AI_PLAYER_RUNTIME_MODEL_MOCK_OUTPUT: '',
    AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: join(seeded.persistRoot, 'provider_accounts_inflight_scheduler.json'),
  })
  try {
    await grantPatrolAiCommandCredits(backend, 'patrol_inflight_scheduler_contract_grant')
    const first = requestJson(
      backend.baseUrl,
      '/api/ai/chat/patrol-scheduler/run',
      'POST',
      {
        aiPlayerIds: [AI_PLAYER_ID],
        cooldownTicks: 6,
        force: true,
        queueRunId: 'patrol_inflight_first',
        idempotencyKey: 'patrol_inflight_idempotency_contract',
        leaseId: 'patrol_inflight_lease_first',
        leaseTtlMs: 30_000,
      },
    )
    await sleep(10)
    const second = requestJson(
      backend.baseUrl,
      '/api/ai/chat/patrol-scheduler/run',
      'POST',
      {
        aiPlayerIds: [AI_PLAYER_ID],
        cooldownTicks: 6,
        force: true,
        queueRunId: 'patrol_inflight_second',
        idempotencyKey: 'patrol_inflight_idempotency_contract',
        leaseId: 'patrol_inflight_lease_second',
        leaseTtlMs: 45_000,
      },
    )

    const [firstResult, secondResult] = await Promise.all([first, second])
    assert.equal(firstResult.status, 200, `first in-flight scheduler run failed: ${JSON.stringify(firstResult.data)}`)
    assert.equal(secondResult.status, 200, `second in-flight scheduler run failed: ${JSON.stringify(secondResult.data)}`)
    const firstPayload = readObject(firstResult.data)
    const secondPayload = readObject(secondResult.data)
    aiPlayerChatPatrolSchedulerRunResponseSchema.parse(firstPayload)
    aiPlayerChatPatrolSchedulerRunResponseSchema.parse(secondPayload)
    assert.equal(relay.probes.length, 1, 'in-flight scheduler dedupe must coalesce model work for the same idempotency key')
    assert.equal(readObject(firstPayload.queue).deduped, false)
    assert.match(String(readObject(firstPayload.queue).leaseExpiresAt), /^\d{4}-\d{2}-\d{2}T/)
    assert.equal(readObject(secondPayload.queue).deduped, true)
    assert.equal(readObject(secondPayload.queue).queueRunId, 'patrol_inflight_second')
    assert.equal(readObject(secondPayload.queue).leaseId, 'patrol_inflight_lease_second')
    assert.equal(
      readObject(readArray(secondPayload.items)[0]).messageId,
      readObject(readArray(firstPayload.items)[0]).messageId,
      'in-flight scheduler dedupe must return the same patrol result instead of writing duplicate messages',
    )
  } finally {
    await backend.stop()
    await relay.stop()
  }
}

async function testPatrolSchedulerExpiredLeaseAllowsRetry() {
  const seeded = seedPatrolTickWorld()
  const relay = await startPatrolRelayProbe(async () => {
    await sleep(80)
    return JSON.stringify({
      summary: 'expired lease retry patrol chose the candidate resource tile',
      proposals: [
        {
          action: 'tile_occupy',
          args: {
            unitId: seeded.unitId,
            tileId: seeded.tileId,
          },
          reason: '资源：目标资源地可占；目标：派当前 AI 部队占领该地块；风险：需要总督批准且后端会校验地块/部队；批准后结果：后端执行占地并生成 receipt。',
        },
      ],
      deferReason: '',
      needsHumanReview: true,
    })
  })
  const backend = await bootPatrolTickBackend(seeded.persistRoot, {
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: relay.baseUrl,
    AI_PLAYER_RUNTIME_MODEL_API_KEY: 'patrol-expired-lease-key-fixture',
    AI_PLAYER_RUNTIME_MODEL: 'patrol/strict-json-model',
    AI_PLAYER_RUNTIME_MODEL_MOCK_OUTPUT: '',
    AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: join(seeded.persistRoot, 'provider_accounts_expired_lease_scheduler.json'),
  })
  try {
    await grantPatrolAiCommandCredits(backend, 'patrol_expired_lease_contract_grant')
    const first = requestJson(
      backend.baseUrl,
      '/api/ai/chat/patrol-scheduler/run',
      'POST',
      {
        aiPlayerIds: [AI_PLAYER_ID],
        cooldownTicks: 6,
        force: true,
        queueRunId: 'patrol_expired_lease_first',
        idempotencyKey: 'patrol_expired_lease_idempotency_contract',
        leaseId: 'patrol_expired_lease_first',
        leaseTtlMs: 1,
      },
    )
    await sleep(15)
    const second = requestJson(
      backend.baseUrl,
      '/api/ai/chat/patrol-scheduler/run',
      'POST',
      {
        aiPlayerIds: [AI_PLAYER_ID],
        cooldownTicks: 6,
        force: true,
        queueRunId: 'patrol_expired_lease_second',
        idempotencyKey: 'patrol_expired_lease_idempotency_contract',
        leaseId: 'patrol_expired_lease_second',
        leaseTtlMs: 30_000,
      },
    )
    const [firstResult, secondResult] = await Promise.all([first, second])
    assert.equal(firstResult.status, 200, `first expired-lease run failed: ${JSON.stringify(firstResult.data)}`)
    assert.equal(secondResult.status, 200, `second expired-lease run failed: ${JSON.stringify(secondResult.data)}`)
    const firstPayload = readObject(firstResult.data)
    const secondPayload = readObject(secondResult.data)
    aiPlayerChatPatrolSchedulerRunResponseSchema.parse(firstPayload)
    aiPlayerChatPatrolSchedulerRunResponseSchema.parse(secondPayload)
    assert.equal(relay.probes.length, 2, 'expired scheduler lease must allow retry instead of coalescing forever')
    assert.equal(readObject(firstPayload.queue).deduped, false)
    assert.equal(readObject(secondPayload.queue).deduped, false)
    assert.equal(readObject(secondPayload.queue).leaseId, 'patrol_expired_lease_second')
  } finally {
    await backend.stop()
    await relay.stop()
  }
}

async function testPatrolSchedulerSamplesActiveAiFirst() {
  const seeded = seedPatrolTickWorld()
  const backend = await bootPatrolTickBackend(seeded.persistRoot, {}, {
    runtimePolicy: { allowLlmProposals: false },
  })
  try {
    const registerActive = await requestJson(backend.baseUrl, '/api/ai/players', 'POST', {
      aiPlayerId: ACTIVE_SAMPLING_AI_PLAYER_ID,
      displayName: 'Active Sampling AI',
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      actionWhitelist: ['battle_report_read', 'troop_heal', 'tile_occupy', 'march_move', 'resource_gather'],
      runtimePolicy: { allowLlmProposals: false },
    })
    assert.equal(registerActive.status, 200, `register active sampling AI failed: ${JSON.stringify(registerActive.data)}`)

    const activeChat = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${ACTIVE_SAMPLING_AI_PLAYER_ID}/chat/messages`,
      'POST',
      {
        senderId: GOVERNOR_PLAYER_ID,
        senderName: '总督',
        body: '这名 AI 刚刚收到人工指令，应优先进入下一轮后台采样。',
        createProposal: false,
      },
    )
    assert.equal(activeChat.status, 200, `active sampling chat write failed: ${JSON.stringify(activeChat.data)}`)

    const scheduler = await requestJson(
      backend.baseUrl,
      '/api/ai/chat/patrol-scheduler/run',
      'POST',
      {
        factionId: FACTION_ID,
        samplingStrategy: 'active_first',
        limit: 1,
        cooldownTicks: 6,
      },
    )
    assert.equal(scheduler.status, 200, `active-first scheduler run failed: ${JSON.stringify(scheduler.data)}`)
    const payload = readObject(scheduler.data)
    aiPlayerChatPatrolSchedulerRunResponseSchema.parse(payload)
    assert.equal(payload.attemptedCount, 1)
    const item = readObject(readArray(payload.items)[0])
    assert.equal(item.aiPlayerId, ACTIVE_SAMPLING_AI_PLAYER_ID)
  } finally {
    await backend.stop()
  }
}

async function testPatrolTickReadModelWithoutModelProposal() {
  const seeded = seedPatrolTickWorld()
  const backend = await bootPatrolTickBackend(seeded.persistRoot, {}, {
    runtimePolicy: {
      allowLlmProposals: false,
    },
  })
  try {
    await upsertPatrolIdentityAddressing(backend)
    const worldBefore = await loadWorldState(backend.baseUrl)
    const patrol = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/patrol-tick`,
      'POST',
      {
        triggeredBy: GOVERNOR_PLAYER_ID,
        triggerMode: 'manual',
        goalPower: 4000,
        battleReportLimit: 3,
        cooldownTicks: 6,
      },
    )
    assert.equal(patrol.status, 200, `patrol tick failed: ${JSON.stringify(patrol.data)}`)
    const patrolPayload = readObject(patrol.data)
    aiPlayerChatPatrolTickResponseSchema.parse(patrolPayload)
    assert.equal(patrolPayload.ok, true)
    assert.equal(patrolPayload.triggerMode, 'manual')
    assert.equal(patrolPayload.scheduled, false)
    assert.equal(patrolPayload.skipped, false)
    assert.equal(patrolPayload.cooldownTicks, 6)
    assert.equal(patrolPayload.cooldownUntilTick, 50)
    assert.equal(patrolPayload.cooldownRemainingTicks, 0)
    assert.equal(patrolPayload.worldVersionBefore, worldBefore.worldVersion)
    assert.equal(patrolPayload.worldVersionAfter, worldBefore.worldVersion)

    const message = readObject(patrolPayload.message)
    assert.equal(message.kind, 'message')
    assert.equal(message.authorType, 'ai')
    assert.equal(message.authorId, AI_PLAYER_ID)
    assert.equal(message.authorName, 'Patrol Operator Alpha')
    assert.match(String(message.body), /巡查完成/)
    assert.match(String(message.body), /候选提案/)
    const messageMetadata = readObject(message.metadata)
    assert.equal(messageMetadata.source, 'manual_patrol_tick')
    assert.equal(messageMetadata.triggerMode, 'manual')
    assert.equal(messageMetadata.cooldownUntilTick, 50)

    const proposalSummary = readObject(patrolPayload.proposalSummary)
    assert.equal(proposalSummary.action, 'tile_occupy')
    assert.equal(proposalSummary.readiness, 'ready')
    assert.equal(proposalSummary.targetUnitId, seeded.unitId)
    assert.equal(proposalSummary.targetTileId, seeded.tileId)
    assert.deepEqual(readObject(proposalSummary.proposalArgs), {
      unitId: seeded.unitId,
      tileId: seeded.tileId,
    })

    const battleSummary = readObject(patrolPayload.battleReportSummary)
    assert.equal(battleSummary.count, 1)
    assert.equal(battleSummary.latestReportId, 'patrol_tick_ai_loss_latest')
    assert.equal(battleSummary.latestSeverity, 'high')
    assert.match(String(battleSummary.latestNextStepSuggestion), /补兵|驻防/)

    const developmentSummary = readObject(patrolPayload.developmentPlanSummary)
    assert.equal(developmentSummary.tick, 44)
    assert.ok(Number(developmentSummary.readyCandidateCount) >= 1)

    const cooldownBlocked = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/patrol-tick`,
      'POST',
      {
        triggeredBy: 'ai_patrol_scheduler',
        triggerMode: 'scheduler',
        goalPower: 4000,
        battleReportLimit: 3,
        cooldownTicks: 6,
      },
    )
    assert.equal(cooldownBlocked.status, 429, `patrol cooldown should reject duplicate scheduler tick: ${JSON.stringify(cooldownBlocked.data)}`)
    const cooldownPayload = readObject(cooldownBlocked.data)
    aiPlayerChatPatrolTickResponseSchema.parse(cooldownPayload)
    assert.equal(cooldownPayload.ok, false)
    assert.equal(cooldownPayload.error, 'patrol_cooldown_active')
    assert.equal(cooldownPayload.triggerMode, 'scheduler')
    assert.equal(cooldownPayload.scheduled, true)
    assert.equal(cooldownPayload.skipped, true)
    assert.equal(cooldownPayload.cooldownUntilTick, 50)
    assert.equal(cooldownPayload.cooldownRemainingTicks, 6)

    const forcedScheduler = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/patrol-tick`,
      'POST',
      {
        triggeredBy: 'ai_patrol_scheduler',
        triggerMode: 'scheduler',
        goalPower: 4000,
        battleReportLimit: 3,
        cooldownTicks: 6,
        force: true,
      },
    )
    assert.equal(forcedScheduler.status, 200, `forced scheduler patrol tick failed: ${JSON.stringify(forcedScheduler.data)}`)
    const forcedPayload = readObject(forcedScheduler.data)
    aiPlayerChatPatrolTickResponseSchema.parse(forcedPayload)
    assert.equal(forcedPayload.ok, true)
    assert.equal(forcedPayload.triggerMode, 'scheduler')
    assert.equal(forcedPayload.scheduled, true)
    assert.equal(readObject(readObject(forcedPayload.message).metadata).source, 'scheduler_patrol_tick')

    const schedulerSkipped = await requestJson(
      backend.baseUrl,
      '/api/ai/chat/patrol-scheduler/run',
      'POST',
      {
        governorPlayerId: GOVERNOR_PLAYER_ID,
        factionId: FACTION_ID,
        cooldownTicks: 6,
        limit: 10,
      },
    )
    assert.equal(schedulerSkipped.status, 200, `scheduler should treat cooldown as a safe skip: ${JSON.stringify(schedulerSkipped.data)}`)
    const schedulerSkippedPayload = readObject(schedulerSkipped.data)
    aiPlayerChatPatrolSchedulerRunResponseSchema.parse(schedulerSkippedPayload)
    assert.equal(schedulerSkippedPayload.ok, true)
    assert.equal(schedulerSkippedPayload.attemptedCount, 1)
    assert.equal(schedulerSkippedPayload.writtenCount, 0)
    assert.equal(schedulerSkippedPayload.skippedCount, 1)
    assert.equal(schedulerSkippedPayload.failedCount, 0)
    assert.deepEqual(readObject(schedulerSkippedPayload.shard), {
      shardIndex: 0,
      shardCount: 1,
      selectedCount: 1,
    })
    assert.deepEqual(readObject(schedulerSkippedPayload.providerBudget), {
      budgetTier: 'economy_chat',
      maxRuns: null,
      consumedRuns: 1,
      remainingRuns: null,
      skippedCount: 0,
    })
    assert.equal(readObject(readArray(schedulerSkippedPayload.items)[0]).error, 'patrol_cooldown_active')

    const schedulerForced = await requestJson(
      backend.baseUrl,
      '/api/ai/chat/patrol-scheduler/run',
      'POST',
      {
        aiPlayerIds: [AI_PLAYER_ID],
        cooldownTicks: 6,
        force: true,
      },
    )
    assert.equal(schedulerForced.status, 200, `forced scheduler run failed: ${JSON.stringify(schedulerForced.data)}`)
    const schedulerForcedPayload = readObject(schedulerForced.data)
    aiPlayerChatPatrolSchedulerRunResponseSchema.parse(schedulerForcedPayload)
    const schedulerForcedAutonomyGuard = readObject(schedulerForcedPayload.autonomyGuard)
    assert.deepEqual(schedulerForcedAutonomyGuard, {
      mode: 'approval_only',
      autonomousExecutionEnabled: false,
      minIntervalMinutes: 15,
      authorityPreserved: true,
      decision: 'disabled',
      reason: 'autonomous_execution_not_enabled',
      pendingApprovalBlocksExecution: true,
    })
    assert.equal(schedulerForcedPayload.ok, true)
    assert.equal(schedulerForcedPayload.attemptedCount, 1)
    assert.equal(schedulerForcedPayload.writtenCount, 1)
    assert.equal(schedulerForcedPayload.skippedCount, 0)
    assert.equal(schedulerForcedPayload.failedCount, 0)
    const schedulerForcedItem = readObject(readArray(schedulerForcedPayload.items)[0])
    assert.equal(schedulerForcedItem.aiPlayerId, AI_PLAYER_ID)
    assert.equal(schedulerForcedItem.ok, true)
    assert.ok(String(schedulerForcedItem.messageId).startsWith('chat_'))
    assert.deepEqual(readObject(schedulerForcedItem.autonomyGuard), schedulerForcedAutonomyGuard)

    const schedulerIdempotentFirst = await requestJson(
      backend.baseUrl,
      '/api/ai/chat/patrol-scheduler/run',
      'POST',
      {
        aiPlayerIds: [AI_PLAYER_ID],
        cooldownTicks: 6,
        force: true,
        queueRunId: 'patrol_queue_run_contract',
        idempotencyKey: 'patrol_idempotency_contract',
        leaseId: 'patrol_lease_contract',
        leaseTtlMs: 30_000,
        backoffMs: 5_000,
        retryAfterMs: 7_000,
      },
    )
    assert.equal(
      schedulerIdempotentFirst.status,
      200,
      `idempotent scheduler first run failed: ${JSON.stringify(schedulerIdempotentFirst.data)}`,
    )
    const schedulerIdempotentFirstPayload = readObject(schedulerIdempotentFirst.data)
    aiPlayerChatPatrolSchedulerRunResponseSchema.parse(schedulerIdempotentFirstPayload)
    assert.equal(schedulerIdempotentFirstPayload.writtenCount, 1)
    const schedulerIdempotentFirstQueue = readObject(schedulerIdempotentFirstPayload.queue)
    assert.equal(schedulerIdempotentFirstQueue.queueRunId, 'patrol_queue_run_contract')
    assert.equal(schedulerIdempotentFirstQueue.idempotencyKey, 'patrol_idempotency_contract')
    assert.equal(schedulerIdempotentFirstQueue.leaseId, 'patrol_lease_contract')
    assert.equal(schedulerIdempotentFirstQueue.leaseTtlMs, 30_000)
    assert.match(String(schedulerIdempotentFirstQueue.leaseExpiresAt), /^\d{4}-\d{2}-\d{2}T/)
    assert.equal(schedulerIdempotentFirstQueue.retryAfterMs, 7_000)
    assert.equal(schedulerIdempotentFirstQueue.backoffMs, 5_000)
    assert.equal(schedulerIdempotentFirstQueue.deduped, false)
    const idempotentFirstItem = readObject(readArray(schedulerIdempotentFirstPayload.items)[0])
    assert.ok(String(idempotentFirstItem.messageId).startsWith('chat_'))

    const schedulerIdempotentReplay = await requestJson(
      backend.baseUrl,
      '/api/ai/chat/patrol-scheduler/run',
      'POST',
      {
        aiPlayerIds: [AI_PLAYER_ID],
        cooldownTicks: 6,
        force: true,
        queueRunId: 'patrol_queue_run_contract_replay',
        idempotencyKey: 'patrol_idempotency_contract',
        leaseId: 'patrol_lease_contract_replay',
        leaseTtlMs: 45_000,
        backoffMs: 9_000,
      },
    )
    assert.equal(
      schedulerIdempotentReplay.status,
      200,
      `idempotent scheduler replay failed: ${JSON.stringify(schedulerIdempotentReplay.data)}`,
    )
    const schedulerIdempotentReplayPayload = readObject(schedulerIdempotentReplay.data)
    aiPlayerChatPatrolSchedulerRunResponseSchema.parse(schedulerIdempotentReplayPayload)
    assert.equal(readObject(schedulerIdempotentReplayPayload.queue).deduped, true)
    assert.equal(readObject(schedulerIdempotentReplayPayload.queue).queueRunId, 'patrol_queue_run_contract_replay')
    assert.equal(readObject(schedulerIdempotentReplayPayload.queue).leaseId, 'patrol_lease_contract_replay')
    assert.equal(readObject(schedulerIdempotentReplayPayload.queue).retryAfterMs, 9_000)
    assert.equal(schedulerIdempotentReplayPayload.writtenCount, schedulerIdempotentFirstPayload.writtenCount)
    assert.equal(
      readObject(readArray(schedulerIdempotentReplayPayload.items)[0]).messageId,
      idempotentFirstItem.messageId,
      'idempotency replay must return cached item without writing a new patrol message',
    )

    const schedulerShardedOut = await requestJson(
      backend.baseUrl,
      '/api/ai/chat/patrol-scheduler/run',
      'POST',
      {
        aiPlayerIds: [AI_PLAYER_ID],
        shardIndex: 1,
        shardCount: 2,
        limit: 10,
      },
    )
    assert.equal(schedulerShardedOut.status, 200, `sharded scheduler run failed: ${JSON.stringify(schedulerShardedOut.data)}`)
    const schedulerShardedOutPayload = readObject(schedulerShardedOut.data)
    aiPlayerChatPatrolSchedulerRunResponseSchema.parse(schedulerShardedOutPayload)
    assert.equal(schedulerShardedOutPayload.attemptedCount, 0)
    assert.deepEqual(readObject(schedulerShardedOutPayload.shard), {
      shardIndex: 1,
      shardCount: 2,
      selectedCount: 0,
    })

    const schedulerBudgetDisabled = await requestJson(
      backend.baseUrl,
      '/api/ai/chat/patrol-scheduler/run',
      'POST',
      {
        aiPlayerIds: [AI_PLAYER_ID],
        providerBudgetTier: 'disabled',
        providerBudgetMaxRuns: 0,
        limit: 10,
      },
    )
    assert.equal(schedulerBudgetDisabled.status, 200, `budget disabled scheduler run failed: ${JSON.stringify(schedulerBudgetDisabled.data)}`)
    const schedulerBudgetDisabledPayload = readObject(schedulerBudgetDisabled.data)
    aiPlayerChatPatrolSchedulerRunResponseSchema.parse(schedulerBudgetDisabledPayload)
    assert.equal(schedulerBudgetDisabledPayload.attemptedCount, 1)
    assert.equal(schedulerBudgetDisabledPayload.writtenCount, 0)
    assert.equal(schedulerBudgetDisabledPayload.skippedCount, 1)
    assert.equal(schedulerBudgetDisabledPayload.failedCount, 0)
    assert.deepEqual(readObject(schedulerBudgetDisabledPayload.providerBudget), {
      budgetTier: 'disabled',
      maxRuns: 0,
      consumedRuns: 0,
      remainingRuns: 0,
      skippedCount: 1,
    })
    assert.equal(readObject(readArray(schedulerBudgetDisabledPayload.items)[0]).error, 'provider_budget_disabled')

    const chatHistory = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20`, 'GET')
    assert.equal(chatHistory.status, 200, `chat history after patrol tick failed: ${JSON.stringify(chatHistory.data)}`)
    const chatPayload = readObject(chatHistory.data)
    const messages = readArray(chatPayload.messages).map((item) => readObject(item))
    assert.equal(messages.length, 5)
    assert.equal(messages[0].messageId, message.messageId)
    assert.equal(messages[0].authorType, 'ai')
    assert.equal(readObject(messages[1].metadata).source, 'scheduler_patrol_tick')
    assert.equal(readObject(messages[2].metadata).source, 'patrol_proactive_message')
    assert.equal(readObject(messages[2].metadata).proactiveReason, 'battle_high_loss')
    assert.equal(readObject(messages[3].metadata).source, 'scheduler_patrol_tick')
    assert.equal(readObject(messages[4].metadata).source, 'scheduler_patrol_tick')
    const historyCounts = readObject(chatPayload.historyCounts)
    assert.equal(historyCounts.all, 5)
    assert.equal(historyCounts.command, 0)
    assert.equal(historyCounts.proposal, 0)
    assert.equal(historyCounts.receipt, 0)

    const worldAfter = await loadWorldState(backend.baseUrl)
    assert.equal(worldAfter.worldVersion, worldBefore.worldVersion, 'patrol tick must not execute or mutate world')
    const tileStates = (worldAfter.map as unknown as { tileStates?: Array<{ id: string; owner?: string }> }).tileStates ?? []
    const tileAfter = worldAfter.map.tiles.find((tile) => tile.id === seeded.tileId)
    const tileStateAfter = tileStates.find((tile) => tile.id === seeded.tileId)
    assert.notEqual(tileAfter?.owner ?? tileStateAfter?.owner, FACTION_ID, 'patrol tick must not occupy the candidate tile')
    const unitAfter = worldAfter.units.find((candidate) => candidate.id === seeded.unitId)
    assert.equal(unitAfter?.tileId, seeded.tileId, 'patrol tick must not move the candidate unit')

  } finally {
    await backend.stop()
  }
}

async function testPatrolTickWritesProactiveMessageWithCooldownWithoutExecuting() {
  const seeded = seedPatrolTickWorld()
  const backend = await bootPatrolTickBackend(seeded.persistRoot, {}, {
    runtimePolicy: {
      allowLlmProposals: false,
    },
  })
  try {
    await upsertPatrolIdentityAddressing(backend)
    const worldBefore = await loadWorldState(backend.baseUrl)
    const firstPatrol = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/patrol-tick`,
      'POST',
      {
        triggeredBy: 'ai_patrol_scheduler',
        triggerMode: 'scheduler',
        goalPower: 4000,
        battleReportLimit: 3,
        cooldownTicks: 6,
        force: true,
      },
    )
    assert.equal(firstPatrol.status, 200, `first proactive patrol tick failed: ${JSON.stringify(firstPatrol.data)}`)
    const firstPayload = readObject(firstPatrol.data)
    aiPlayerChatPatrolTickResponseSchema.parse(firstPayload)
    assert.equal(firstPayload.ok, true)
    assert.equal(firstPayload.triggerMode, 'scheduler')
    assert.equal(firstPayload.scheduled, true)
    assert.equal(firstPayload.modelProposal, undefined)
    assert.equal(firstPayload.modelProposalMessage, undefined)

    const proactiveMessage = readObject(firstPayload.proactiveMessage)
    assert.equal(proactiveMessage.kind, 'message')
    assert.equal(proactiveMessage.authorType, 'ai')
    assert.equal(proactiveMessage.authorId, AI_PLAYER_ID)
    assert.match(String(proactiveMessage.body), /主公/)
    assert.doesNotMatch(String(proactiveMessage.body), /大哥/)
    const proactiveMetadata = readObject(proactiveMessage.metadata)
    aiPlayerProactivePatrolMessageMetadataSchema.parse(proactiveMetadata)
    assert.equal(proactiveMetadata.source, 'patrol_proactive_message')
    assert.equal(proactiveMetadata.proactiveReason, 'battle_high_loss')
    assert.equal(proactiveMetadata.severity, 'high')
    assert.equal(proactiveMetadata.relatedReportId, 'patrol_tick_ai_loss_latest')
    assert.equal(proactiveMetadata.suggestedAction, 'troop_heal')
    assert.equal(proactiveMetadata.cooldownMinutes, 30)
    assert.equal(proactiveMetadata.triggerMode, 'scheduler')
    assert.deepEqual(readObject(proactiveMetadata.triggerCondition), {
      policyVersion: 'patrol_proactive_trigger_v1',
      reason: 'battle_high_loss',
      source: 'battle_report',
      cooldownMinutes: 30,
      requiresHumanApproval: true,
      noAutonomousExecution: true,
    })
    assert.deepEqual(readObject(proactiveMetadata.addressing), {
      value: '主公',
      source: 'identity_context',
    })
    assert.equal(readObject(proactiveMetadata.battleReportSummary).latestReportId, 'patrol_tick_ai_loss_latest')

    const secondPatrol = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/patrol-tick`,
      'POST',
      {
        triggeredBy: 'ai_patrol_scheduler',
        triggerMode: 'scheduler',
        goalPower: 4000,
        battleReportLimit: 3,
        cooldownTicks: 6,
        force: true,
      },
    )
    assert.equal(secondPatrol.status, 200, `second proactive patrol tick failed: ${JSON.stringify(secondPatrol.data)}`)
    const secondPayload = readObject(secondPatrol.data)
    aiPlayerChatPatrolTickResponseSchema.parse(secondPayload)
    assert.equal(secondPayload.ok, true)
    assert.equal(secondPayload.proactiveMessage, undefined)

    const chatHistory = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20`, 'GET')
    assert.equal(chatHistory.status, 200, `chat history after proactive patrol failed: ${JSON.stringify(chatHistory.data)}`)
    const chatHistoryPayload = readObject(chatHistory.data)
    const messages = readArray(chatHistoryPayload.messages).map((item) => readObject(item))
    assert.equal(messages.length, 3)
    assert.equal(messages[0].kind, 'message')
    assert.equal(readObject(messages[0].metadata).source, 'scheduler_patrol_tick')
    assert.equal(messages[1].messageId, proactiveMessage.messageId)
    assert.equal(readObject(messages[1].metadata).source, 'patrol_proactive_message')
    assert.equal(messages[2].kind, 'message')
    assert.equal(readObject(messages[2].metadata).source, 'scheduler_patrol_tick')
    const historyCounts = readObject(chatHistoryPayload.historyCounts)
    assert.equal(historyCounts.all, 3)
    assert.equal(historyCounts.command, 0)
    assert.equal(historyCounts.proposal, 0)
    assert.equal(historyCounts.receipt, 0)
    assert.equal(historyCounts.failure, 0)

    const proposals = await requestJson(backend.baseUrl, `/api/ai/players/proposals?aiPlayerId=${AI_PLAYER_ID}&limit=10`, 'GET')
    assert.equal(proposals.status, 200, `proposal list after proactive patrol failed: ${JSON.stringify(proposals.data)}`)
    assert.equal(readArray(readObject(proposals.data).items).length, 0)

    const worldAfter = await loadWorldState(backend.baseUrl)
    assert.equal(worldAfter.worldVersion, worldBefore.worldVersion, 'proactive patrol message must not mutate world')
    const tileStates = (worldAfter.map as unknown as { tileStates?: Array<{ id: string; owner?: string }> }).tileStates ?? []
    const tileAfter = worldAfter.map.tiles.find((tile) => tile.id === seeded.tileId)
    const tileStateAfter = tileStates.find((tile) => tile.id === seeded.tileId)
    assert.notEqual(tileAfter?.owner ?? tileStateAfter?.owner, FACTION_ID, 'proactive patrol message must not occupy the candidate tile')
  } finally {
    await backend.stop()
  }
}

async function testPatrolTickCreatesGovernedModelProposalWithoutExecuting() {
  const seeded = seedPatrolTickWorld()
  const backend = await bootPatrolTickBackend(seeded.persistRoot, {
    AI_PLAYER_RUNTIME_MODEL_MOCK_OUTPUT: JSON.stringify({
      summary: 'patrol chose the visible neutral resource tile for governor review',
      proposals: [
        {
          action: 'tile_occupy',
          args: {
            unitId: seeded.unitId,
            tileId: seeded.tileId,
          },
          reason: '资源：目标资源地可占；目标：派当前 AI 部队占领该地块；风险：需要总督批准且后端会校验地块/部队；批准后结果：后端执行占地并生成 receipt。',
        },
      ],
      deferReason: '',
      needsHumanReview: true,
    }),
  })
  try {
    await grantPatrolAiCommandCredits(backend, 'patrol_model_proposal_contract_grant')
    const worldBefore = await loadWorldState(backend.baseUrl)
    const patrol = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/patrol-tick`,
      'POST',
      {
        triggeredBy: GOVERNOR_PLAYER_ID,
        triggerMode: 'manual',
        goalPower: 4000,
        battleReportLimit: 3,
        cooldownTicks: 6,
      },
    )
    assert.equal(patrol.status, 200, `patrol tick with model proposal failed: ${JSON.stringify(patrol.data)}`)
    const patrolPayload = readObject(patrol.data)
    aiPlayerChatPatrolTickResponseSchema.parse(patrolPayload)
    assert.equal(patrolPayload.ok, true)

    const modelProposal = readObject(patrolPayload.modelProposal)
    assert.equal(modelProposal.action, 'tile_occupy')
    assert.equal(modelProposal.source, 'llm')
    assert.equal(modelProposal.status, 'pending_approval')
    assert.equal(modelProposal.requiresApproval, true)
    assert.deepEqual(readObject(modelProposal.args), {
      unitId: seeded.unitId,
      tileId: seeded.tileId,
    })

    const modelProposalMessage = readObject(patrolPayload.modelProposalMessage)
    assert.equal(modelProposalMessage.kind, 'proposal')
    assert.equal(modelProposalMessage.proposalId, modelProposal.proposalId)
    assert.equal(readObject(modelProposalMessage.metadata).source, 'llm')
    assert.equal(readObject(modelProposalMessage.metadata).proposalMode, 'model')

    const chatHistory = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20`, 'GET')
    assert.equal(chatHistory.status, 200, `chat history after model patrol tick failed: ${JSON.stringify(chatHistory.data)}`)
    const messages = readArray(readObject(chatHistory.data).messages).map((item) => readObject(item))
    assert.equal(messages.length, 2)
    assert.equal(messages[0].kind, 'message')
    assert.equal(messages[1].kind, 'proposal')

    const worldAfter = await loadWorldState(backend.baseUrl)
    assert.equal(worldAfter.worldVersion, worldBefore.worldVersion, 'patrol model proposal must not execute or mutate world')
    const tileStates = (worldAfter.map as unknown as { tileStates?: Array<{ id: string; owner?: string }> }).tileStates ?? []
    const tileAfter = worldAfter.map.tiles.find((tile) => tile.id === seeded.tileId)
    const tileStateAfter = tileStates.find((tile) => tile.id === seeded.tileId)
    assert.notEqual(tileAfter?.owner ?? tileStateAfter?.owner, FACTION_ID, 'patrol model proposal must not occupy the candidate tile')
  } finally {
    await backend.stop()
  }
}

async function testPatrolTickModelPromptPinsCandidateAction() {
  const seeded = seedPatrolTickWorld()
  const relay = await startPatrolRelayProbe(() => JSON.stringify({
    summary: 'patrol chose the candidate resource tile for governor review',
    proposals: [
      {
        action: 'tile_occupy',
        args: {
          unitId: seeded.unitId,
          tileId: seeded.tileId,
        },
        reason: '资源：目标资源地可占；目标：派当前 AI 部队占领该地块；风险：需要总督批准且后端会校验地块/部队；批准后结果：后端执行占地并生成 receipt。',
      },
    ],
    deferReason: '',
    needsHumanReview: true,
  }))
  const backend = await bootPatrolTickBackend(seeded.persistRoot, {
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: relay.baseUrl,
    AI_PLAYER_RUNTIME_MODEL_API_KEY: 'patrol-prompt-key-fixture',
    AI_PLAYER_RUNTIME_MODEL: 'patrol/strict-json-model',
    AI_PLAYER_RUNTIME_MODEL_MOCK_OUTPUT: '',
    LLM_RELAY_URL: relay.baseUrl,
    LLM_RELAY_MODEL: 'patrol/strict-json-model',
    LLM_RELAY_API_KEY: 'patrol-prompt-key-fixture',
    LLM_RELAY_API_KEYS: '',
    OPENAI_API_KEY: '',
    AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: join(seeded.persistRoot, 'provider_accounts_prompt.json'),
  })
  try {
    for (let index = 1; index <= 10; index += 1) {
      const seed = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages`, 'POST', {
        body: `patrol checkpoint seed message ${index}`,
        senderId: GOVERNOR_PLAYER_ID,
        senderName: '总督',
        createProposal: false,
      })
      assert.equal(seed.status, 200, `patrol checkpoint seed message ${index} failed: ${JSON.stringify(seed.data)}`)
    }

    await grantPatrolAiCommandCredits(backend, 'patrol_prompt_contract_grant')
    const patrol = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/patrol-tick`,
      'POST',
      {
        triggeredBy: GOVERNOR_PLAYER_ID,
        triggerMode: 'manual',
        goalPower: 4000,
        battleReportLimit: 3,
        cooldownTicks: 6,
      },
    )
    assert.equal(patrol.status, 200, `patrol prompt tick failed: ${JSON.stringify(patrol.data)}`)
    assert.equal(relay.probes.length, 1)
    const requestBody = readObject(JSON.parse(relay.bodies[0]))
    const messages = readArray(requestBody.messages).map((item) => readObject(item))
    const userMessage = messages.find((item) => item.role === 'user')
    assert.ok(userMessage, 'patrol model request must include a user message')
    const content = String(userMessage.content)
    assert.match(content, /candidate=tile_occupy/)
    assert.match(content, /proposals\[0\]\.action must exactly equal candidate/)
    assert.match(content, /Do not propose resource_transfer_to_governor/)
    const observation = readObject(JSON.parse(content))
    const chatSummary = readObject(observation.chatSummary)
    assert.equal(chatSummary.method, 'deterministic_backend_checkpoint_v1')
    assert.equal(chatSummary.sourceMessageCount, 20)
    assert.match(String(chatSummary.summary), /messages 1-20/)
    const recentChat = readArray(observation.recentChat).map((item) => readObject(item))
    assert.equal(recentChat.length, 10)
    assert.equal(recentChat.at(-1)?.authorType, 'ai')
    assert.equal(String(relay.bodies[0]).includes('patrol-prompt-key-fixture'), false, 'patrol model request body must not include provider API key')
  } finally {
    await backend.stop()
    await relay.stop()
  }
}

async function run() {
  await testPatrolTickReadModelWithoutModelProposal()
  await testPatrolTickWritesProactiveMessageWithCooldownWithoutExecuting()
  await testPatrolSchedulerCoalescesInFlightIdempotencyKey()
  await testPatrolSchedulerExpiredLeaseAllowsRetry()
  await testPatrolSchedulerSamplesActiveAiFirst()
  await testPatrolTickCreatesGovernedModelProposalWithoutExecuting()
  await testPatrolTickModelPromptPinsCandidateAction()
  console.log('[ai_player_http_chat_patrol_tick_contract] all checks passed')
}

run().catch((error) => {
  console.error('[ai_player_http_chat_patrol_tick_contract] failed:', error)
  process.exitCode = 1
})
