import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { writeFileSync } from 'node:fs'
import { createInitialWorldState } from '../../shared/domain/scenario'
import { aiPlayerReceiptChatMetadataSchema } from '../../shared/schemas/aiPlayerChat'
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
} from './helpers/backendHarness'

const AI_PLAYER_ID = 'player_operator_chat_alpha'
const LOW_RESOURCE_AI_PLAYER_ID = 'player_operator_chat_low_resource'
const FACTION_ID = 'player'
const GOVERNOR_PLAYER_ID = 'human_alpha'
const TRANSFER_WOOD = 11
const EXPERIENCE_UNIT_ID = 'u4'
const EXPERIENCE_HERO_ID = '100027'
const EXPERIENCE_TILE_ID = 'tile_12'
const MODEL_OUTPUT = {
  summary: 'chat command asks the logistics AI to transfer wood to the governor inbox',
  proposals: [
    {
      action: 'resource_transfer_to_governor',
      args: {
        resources: {
          wood: TRANSFER_WOOD,
        },
      },
      reason: 'The governor chat command requested wood transfer and runtime.resourceTransfer.canTransferNow is true.',
    },
  ],
  deferReason: '',
  needsHumanReview: true,
}

async function startChatRelayProbe(contentFactory: (callCount: number) => unknown = () => JSON.stringify(MODEL_OUTPUT)) {
  const port = await getAvailablePort()
  const probes: string[] = []
  const requestBodies: string[] = []
  const server = createServer((req, res) => {
    probes.push(String(req.url ?? ''))
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })
    req.on('end', () => {
      requestBodies.push(Buffer.concat(chunks).toString('utf-8'))
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({
        model: 'chat-budget-test-model',
        choices: [
          {
            message: {
              content: contentFactory(probes.length),
            },
          },
        ],
        usage: { prompt_tokens: 3, completion_tokens: 4, total_tokens: 7 },
      }))
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve())
  })
  return {
    baseUrl: `http://127.0.0.1:${port}/v1`,
    probes,
    requestBodies,
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

function seedWorldStateWithAiResourceSubaccount() {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding AI chat command shard`)
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: '青州后勤官',
      factionId: FACTION_ID,
      unitIds: [],
      specialty: 'logistics',
    },
    {
      id: LOW_RESOURCE_AI_PLAYER_ID,
      name: '青州见习后勤官',
      factionId: FACTION_ID,
      unitIds: [],
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
        wood: 40,
        stone: 0,
        iron: 0,
      },
      updatedTick: world.tick,
    },
    [LOW_RESOURCE_AI_PLAYER_ID]: {
      aiPlayerId: LOW_RESOURCE_AI_PLAYER_ID,
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      resources: {
        food: 0,
        wood: 2,
        stone: 0,
        iron: 0,
      },
      updatedTick: world.tick,
    },
  }
  faction.aiResourceTransferPolicy = {
    cooldownTicks: 10_000,
  }
  faction.governorResourceInboxes = {}

  const path = buildSessionPersistPath('ai_player_http_chat_command_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return path
}

function seedWorldStateWithAiExperienceTarget() {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding AI experience command shard`)
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: '青州练兵官',
      factionId: FACTION_ID,
      unitIds: [EXPERIENCE_UNIT_ID],
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
  faction.actionPoints = 10
  faction.food = 20

  const unit = world.units.find((candidate) => candidate.id === EXPERIENCE_UNIT_ID)
  assert.ok(unit, `missing experience target unit ${EXPERIENCE_UNIT_ID}`)
  unit.tileId = EXPERIENCE_TILE_ID
  unit.status = '待命'
  unit.currentTask = undefined
  unit.strength = 180
  unit.supply = 9
  unit.mobility = 12
  unit.hero.level = 24
  unit.hero.exp = 90

  const tile = world.map.tiles.find((candidate) => candidate.id === EXPERIENCE_TILE_ID)
  assert.ok(tile, `missing experience target tile ${EXPERIENCE_TILE_ID}`)
  tile.type = 'resource'
  tile.owner = 'neutral'
  tile.terrain = 'grassland'
  tile.resourceKind = 'food'
  tile.resourceLevel = 1
  tile.enemyPressure = 2
  tile.moveCost = 1

  world.feedback.battleRecords = []
  world.reports = []
  world.executions[FACTION_ID] = null

  const path = buildSessionPersistPath('ai_player_http_chat_command_experience_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return path
}

async function loadWorldState(baseUrl: string) {
  const worldResult = await requestJson(baseUrl, '/api/world?intelMode=full', 'GET', undefined, 30_000)
  assert.equal(worldResult.status, 200, `world route failed: ${JSON.stringify(worldResult.data)}`)
  return readObject(readObject(worldResult.data).world)
}

async function testChatCommandApprovesAndRejectsLatestPendingProposalByNaturalLanguage() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_http_chat_command_decision_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_http_chat_command_decision_session_state'),
    WORLD_STATE_PERSIST_PATH: seedWorldStateWithAiResourceSubaccount(),
  })
  try {
    assert.ok(await waitForHealth(baseUrl), `decision backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)
    const register = await requestJson(baseUrl, '/api/ai/players', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      displayName: '青州后勤官',
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      actionWhitelist: ['resource_transfer_to_governor'],
      budgetPolicy: {
        allowHighRiskActions: true,
      },
    })
    assert.equal(register.status, 200, `register decision ai failed: ${JSON.stringify(register.data)}`)

    const approveProposalCreate = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      action: 'resource_transfer_to_governor',
      args: {
        resources: {
          wood: 1,
        },
      },
      reason: 'chat decision approve fixture',
      source: 'human',
    })
    assert.equal(approveProposalCreate.status, 200, `create approve decision proposal failed: ${JSON.stringify(approveProposalCreate.data)}`)
    const approveProposal = readObject(readObject(approveProposalCreate.data).proposal)
    assert.equal(approveProposal.status, 'pending_approval')

    const approveDecision = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages`, 'POST', {
      body: '批准刚才这个方案。',
      senderId: GOVERNOR_PLAYER_ID,
      senderName: '总督',
      createProposal: true,
    })
    assert.equal(approveDecision.status, 200, `chat approve decision failed: ${JSON.stringify(approveDecision.data)}`)
    const approveDecisionPayload = readObject(approveDecision.data)
    assert.equal(approveDecisionPayload.ok, true)
    const approvedProposal = readObject(approveDecisionPayload.proposal)
    assert.equal(approvedProposal.proposalId, approveProposal.proposalId)
    assert.equal(approvedProposal.status, 'approved')
    const approveAiMessage = readObject(approveDecisionPayload.aiMessage)
    assert.equal(approveAiMessage.kind, 'message')
    assert.equal(approveAiMessage.authorType, 'ai')
    assert.match(String(approveAiMessage.body), /已批准/)
    assert.match(String(approveAiMessage.body), /等我执行/)
    assert.doesNotMatch(String(approveAiMessage.body), /proposalId|worldAction|approve|execute|JSON|read model|authority|snake_case/i)
    const approveMetadata = readObject(approveAiMessage.metadata)
    assert.equal(approveMetadata.source, 'chat_natural_language_proposal_decision')
    assert.equal(approveMetadata.decision, 'approve')
    assert.equal(approveMetadata.authorityPreserved, true)

    const chatAfterApproveDecision = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20`, 'GET')
    assert.equal(chatAfterApproveDecision.status, 200, `chat after approve decision failed: ${JSON.stringify(chatAfterApproveDecision.data)}`)
    const approveDecisionMessages = readArray(readObject(chatAfterApproveDecision.data).messages).map((item) => readObject(item))
    const approvedProposalMessage = approveDecisionMessages.find((item) => item.kind === 'proposal' && item.proposalId === approveProposal.proposalId)
    assert.ok(approvedProposalMessage, 'approve decision should keep the original proposal message in chat')
    assert.equal(readObject(approvedProposalMessage.metadata).status, 'approved')
    assert.doesNotMatch(String(approvedProposalMessage.body), /待批准/)
    assert.doesNotMatch(String(approvedProposalMessage.body), /recruit_pool_select|等待确认/)

    const rejectProposalCreate = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      action: 'resource_transfer_to_governor',
      args: {
        resources: {
          wood: 2,
        },
      },
      reason: 'chat decision reject fixture',
      source: 'human',
    })
    assert.equal(rejectProposalCreate.status, 200, `create reject decision proposal failed: ${JSON.stringify(rejectProposalCreate.data)}`)
    const rejectProposal = readObject(readObject(rejectProposalCreate.data).proposal)
    assert.equal(rejectProposal.status, 'pending_approval')

    const rejectDecision = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages`, 'POST', {
      body: '驳回刚才那个方案。',
      senderId: GOVERNOR_PLAYER_ID,
      senderName: '总督',
      createProposal: true,
    })
    assert.equal(rejectDecision.status, 200, `chat reject decision failed: ${JSON.stringify(rejectDecision.data)}`)
    const rejectDecisionPayload = readObject(rejectDecision.data)
    assert.equal(rejectDecisionPayload.ok, true)
    const rejectedProposal = readObject(rejectDecisionPayload.proposal)
    assert.equal(rejectedProposal.proposalId, rejectProposal.proposalId)
    assert.equal(rejectedProposal.status, 'rejected')
    const rejectAiMessage = readObject(rejectDecisionPayload.aiMessage)
    assert.equal(rejectAiMessage.kind, 'message')
    assert.equal(rejectAiMessage.authorType, 'ai')
    assert.match(String(rejectAiMessage.body), /已驳回/)
    assert.match(String(rejectAiMessage.body), /不会执行/)
    assert.doesNotMatch(String(rejectAiMessage.body), /proposalId|worldAction|approve|execute|JSON|read model|authority|snake_case/i)
    const rejectMetadata = readObject(rejectAiMessage.metadata)
    assert.equal(rejectMetadata.source, 'chat_natural_language_proposal_decision')
    assert.equal(rejectMetadata.decision, 'reject')
    assert.equal(rejectMetadata.authorityPreserved, true)

    const chatAfterDecisions = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20`, 'GET')
    assert.equal(chatAfterDecisions.status, 200, `chat after decisions failed: ${JSON.stringify(chatAfterDecisions.data)}`)
    const decisionMessages = readArray(readObject(chatAfterDecisions.data).messages).map((item) => readObject(item))
    assert.ok(decisionMessages.some((item) => item.kind === 'message' && item.authorType === 'ai' && String(item.body).includes('已批准')))
    assert.ok(decisionMessages.some((item) => item.kind === 'message' && item.authorType === 'ai' && String(item.body).includes('已驳回')))
    const rejectedProposalMessage = decisionMessages.find((item) => item.kind === 'proposal' && item.proposalId === rejectProposal.proposalId)
    assert.ok(rejectedProposalMessage, 'reject decision should keep the original proposal message in chat')
    assert.equal(readObject(rejectedProposalMessage.metadata).status, 'rejected')
    assert.doesNotMatch(String(rejectedProposalMessage.body), /待批准/)
    assert.doesNotMatch(String(rejectedProposalMessage.body), /recruit_pool_select|等待确认/)
  } finally {
    await shutdownChild(child)
  }
}

async function testChatCommandRoutesHeroLevelPreferenceToResourceLandExperience() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_http_chat_command_experience_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_http_chat_command_experience_session_state'),
    WORLD_STATE_PERSIST_PATH: seedWorldStateWithAiExperienceTarget(),
    AI_PLAYER_RUNTIME_MODEL_MOCK_OUTPUT: JSON.stringify({
      summary: 'wrong direct level proposal from model fixture',
      proposals: [
        {
          action: 'hero_level_upgrade',
          args: { heroId: EXPERIENCE_HERO_ID },
          reason: 'This fixture must be ignored because hero level growth routes through resource-land experience.',
        },
      ],
      deferReason: '',
      needsHumanReview: true,
    }),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `experience backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: FACTION_ID,
      playerName: GOVERNOR_PLAYER_ID,
    })
    assert.equal(join.status, 200, `experience session join failed: ${JSON.stringify(join.data)}`)

    const register = await requestJson(baseUrl, '/api/ai/players', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      displayName: '青州练兵官',
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      actionWhitelist: ['tile_occupy', 'march_move', 'resource_gather', 'tactical_skill_upgrade', 'hero_star_upgrade', 'building_upgrade'],
      budgetPolicy: {
        allowHighRiskActions: true,
      },
    })
    assert.equal(register.status, 200, `experience register failed: ${JSON.stringify(register.data)}`)

    const sent = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages`, 'POST', {
      body: '青州练兵官，让张辽去刷经验，打当前这块资源地升级。',
      senderId: GOVERNOR_PLAYER_ID,
      senderName: '总督',
      createProposal: true,
    })
    assert.equal(sent.status, 200, `experience chat command failed: ${JSON.stringify(sent.data)}`)
    const sentPayload = readObject(sent.data)
    assert.equal(sentPayload.ok, true)
    const proposal = readObject(sentPayload.proposal)
    assert.equal(proposal.action, 'tile_occupy', 'hero level preference should route to resource-land combat, not direct level-up')
    assert.equal(proposal.source, 'human')
    assert.deepEqual(readObject(proposal.args), { unitId: EXPERIENCE_UNIT_ID, tileId: EXPERIENCE_TILE_ID })
    const proposalMessage = readObject(sentPayload.proposalMessage)
    assert.equal(readObject(proposalMessage.metadata).source, 'chat_explicit_hero_experience_route')

    const proposalId = String(proposal.proposalId)
    const approve = await requestJson(baseUrl, `/api/ai/players/proposals/${proposalId}/approve`, 'POST', {
      approvedBy: GOVERNOR_PLAYER_ID,
    })
    assert.equal(approve.status, 200, `approve experience proposal failed: ${JSON.stringify(approve.data)}`)

    const execute = await requestJson(baseUrl, `/api/ai/players/proposals/${proposalId}/execute`, 'POST', {
      executedBy: GOVERNOR_PLAYER_ID,
      includeWorld: true,
    }, 60_000)
    assert.equal(execute.status, 200, `execute experience proposal failed: ${JSON.stringify(execute.data)}`)
    const receipt = readObject(readObject(execute.data).receipt)
    assert.equal(receipt.ok, true)
    assert.equal(receipt.worldAction, 'occupyTile')
    const worldReceipt = readObject(receipt.worldReceipt)
    assert.equal(worldReceipt.action, 'occupyTile')
    assert.equal(worldReceipt.heroId, EXPERIENCE_HERO_ID)
    assert.equal(worldReceipt.expGained, 20)
    assert.equal(worldReceipt.previousExp, 90)
    assert.equal(worldReceipt.nextExp, 10)
    assert.equal(worldReceipt.previousLevel, 24)
    assert.equal(worldReceipt.nextLevel, 25)
    assert.equal(readObject(worldReceipt.hero).level, 25)

    const worldAfter = await loadWorldState(baseUrl)
    const unitsAfter = readArray(worldAfter.units).map((item) => readObject(item))
    const unitAfter = unitsAfter.find((item) => item.id === EXPERIENCE_UNIT_ID)
    assert.ok(unitAfter, 'experience target unit should remain in world')
    assert.equal(readObject(unitAfter.hero).level, 25)
    assert.equal(readObject(unitAfter.hero).exp, 10)
  } finally {
    await shutdownChild(child)
  }
}

async function testChatCommandUsesExplicitUpgradeTargetPreference() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_http_chat_command_upgrade_preference_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_http_chat_command_upgrade_preference_session_state'),
    WORLD_STATE_PERSIST_PATH: seedWorldStateWithAiExperienceTarget(),
    AI_PLAYER_RUNTIME_MODEL_MOCK_OUTPUT: JSON.stringify({
      summary: 'wrong model fixture',
      proposals: [
        {
          action: 'resource_transfer_to_governor',
          args: { resources: { wood: 1 } },
          reason: 'This fixture must be ignored because the governor specified a tactical-skill upgrade target.',
        },
      ],
      deferReason: '',
      needsHumanReview: true,
    }),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `upgrade preference backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: FACTION_ID,
      playerName: GOVERNOR_PLAYER_ID,
    })
    assert.equal(join.status, 200, `upgrade preference session join failed: ${JSON.stringify(join.data)}`)

    const register = await requestJson(baseUrl, '/api/ai/players', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      displayName: '青州练兵官',
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      actionWhitelist: ['tactical_skill_upgrade', 'hero_star_upgrade', 'building_upgrade', 'tile_occupy'],
      budgetPolicy: {
        allowHighRiskActions: true,
      },
    })
    assert.equal(register.status, 200, `upgrade preference register failed: ${JSON.stringify(register.data)}`)

    const sent = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages`, 'POST', {
      body: '青州练兵官，优先给张辽升战法，先升破阵追袭。',
      senderId: GOVERNOR_PLAYER_ID,
      senderName: '总督',
      createProposal: true,
    })
    assert.equal(sent.status, 200, `upgrade preference chat command failed: ${JSON.stringify(sent.data)}`)
    const sentPayload = readObject(sent.data)
    assert.equal(sentPayload.ok, true)
    const proposal = readObject(sentPayload.proposal)
    assert.equal(proposal.action, 'tactical_skill_upgrade')
    assert.equal(proposal.source, 'human')
    assert.deepEqual(readObject(proposal.args), {
      heroId: EXPERIENCE_HERO_ID,
      skillId: 'lib_s_chase_rending_charge',
    })
    const proposalMessage = readObject(sentPayload.proposalMessage)
    assert.equal(readObject(proposalMessage.metadata).source, 'chat_explicit_upgrade_preference')
  } finally {
    await shutdownChild(child)
  }
}

async function testChatCommandEmptyModelProposalsWritesIdleSummary() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const idleSummary = 'I noted the situation and will wait for a concrete governed objective.'
  let child = spawnBackend(port, tail, {
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_http_chat_command_idle_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_http_chat_command_idle_session_state'),
    WORLD_STATE_PERSIST_PATH: seedWorldStateWithAiResourceSubaccount(),
    AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: buildSessionPersistPath('ai_player_http_chat_command_idle_provider_store'),
    AI_PLAYER_RUNTIME_MODEL_MOCK_OUTPUT: JSON.stringify({
      summary: idleSummary,
      proposals: [],
      deferReason: 'idle_chat',
      needsHumanReview: false,
    }),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `idle-summary backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: FACTION_ID,
      playerName: GOVERNOR_PLAYER_ID,
    })
    assert.equal(join.status, 200, `idle-summary session join failed: ${JSON.stringify(join.data)}`)

    const register = await requestJson(baseUrl, '/api/ai/players', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      displayName: 'Qingzhou logistics officer',
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      actionWhitelist: ['resource_transfer_to_governor'],
      budgetPolicy: {
        allowHighRiskActions: true,
      },
    })
    assert.equal(register.status, 200, `idle-summary register failed: ${JSON.stringify(register.data)}`)

    const worldBefore = await loadWorldState(baseUrl)
    const sent = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages`, 'POST', {
      body: 'How are things today?',
      senderId: GOVERNOR_PLAYER_ID,
      senderName: 'Governor',
      createProposal: true,
    })
    assert.equal(sent.status, 200, `idle-summary chat command failed: ${JSON.stringify(sent.data)}`)
    const sentPayload = readObject(sent.data)
    assert.equal(sentPayload.ok, true)
    assert.equal(sentPayload.proposal, undefined)
    assert.equal(sentPayload.proposalMessage, undefined)

    const aiMessage = readObject(sentPayload.aiMessage)
    assert.equal(aiMessage.kind, 'message')
    assert.equal(aiMessage.authorType, 'ai')
    assert.equal(aiMessage.failureCode, undefined)
    assert.equal(aiMessage.body, idleSummary)
    const metadata = readObject(aiMessage.metadata)
    assert.equal(metadata.source, 'chat_model_idle_summary')
    assert.equal(metadata.deferReason, 'idle_chat')
    assert.equal(metadata.authorityPreserved, true)

    const proposals = await requestJson(baseUrl, `/api/ai/players/proposals?aiPlayerId=${AI_PLAYER_ID}&limit=10`, 'GET')
    assert.equal(proposals.status, 200, `proposal list after idle chat failed: ${JSON.stringify(proposals.data)}`)
    assert.equal(readArray(readObject(proposals.data).items).length, 0)

    const failureHistory = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20&filter=failure`, 'GET')
    assert.equal(failureHistory.status, 200, `idle-summary failure history failed: ${JSON.stringify(failureHistory.data)}`)
    assert.equal(readArray(readObject(failureHistory.data).messages).length, 0)

    const chatHistory = await requestJson(
      baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20&readerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
    )
    assert.equal(chatHistory.status, 200, `idle-summary chat history failed: ${JSON.stringify(chatHistory.data)}`)
    const chatHistoryPayload = readObject(chatHistory.data)
    const chatHistoryMessages = readArray(chatHistoryPayload.messages)
    assert.equal(chatHistoryMessages.length, 2)
    const historyCounts = readObject(chatHistoryPayload.historyCounts)
    assert.equal(historyCounts.command, 1)
    assert.equal(historyCounts.proposal, 0)
    assert.equal(historyCounts.receipt, 0)
    assert.equal(historyCounts.failure, 0)
    assert.equal(readObject(chatHistoryPayload.readCursor).unreadCount, 2)

    const worldAfter = await loadWorldState(baseUrl)
    assert.equal(worldAfter.worldVersion, worldBefore.worldVersion, 'idle model summary must not mutate world')
  } finally {
    await shutdownChild(child)
  }
}

async function testChatCommandBudgetExhaustedWritesRuleMessage() {
  const relay = await startChatRelayProbe()
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  let child = spawnBackend(port, tail, {
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_http_chat_command_budget_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_http_chat_command_budget_session_state'),
    WORLD_STATE_PERSIST_PATH: seedWorldStateWithAiResourceSubaccount(),
    AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: buildSessionPersistPath('ai_player_http_chat_command_budget_provider_store'),
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: relay.baseUrl,
    AI_PLAYER_RUNTIME_MODEL_API_KEY: 'chat-budget-key-fixture',
    AI_PLAYER_RUNTIME_MODEL: 'chat/strict-json-model',
    AI_PLAYER_PROVIDER_BUDGET_MAX_RUNS_PER_WINDOW: '0',
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `budget backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: FACTION_ID,
      playerName: GOVERNOR_PLAYER_ID,
    })
    assert.equal(join.status, 200, `budget session join failed: ${JSON.stringify(join.data)}`)

    const register = await requestJson(baseUrl, '/api/ai/players', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      displayName: '青州后勤官',
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      actionWhitelist: ['resource_transfer_to_governor'],
      budgetPolicy: {
        allowHighRiskActions: true,
      },
    })
    assert.equal(register.status, 200, `budget register failed: ${JSON.stringify(register.data)}`)

    const sent = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages`, 'POST', {
      body: `青州后勤官，输送 ${TRANSFER_WOOD} 木材到总督的通用收件箱。`,
      senderId: GOVERNOR_PLAYER_ID,
      senderName: '总督',
      createProposal: true,
    })
    assert.equal(sent.status, 200, `budget exhausted chat command failed: ${JSON.stringify(sent.data)}`)
    const sentPayload = readObject(sent.data)
    assert.equal(sentPayload.ok, true)
    assert.equal(sentPayload.proposal, undefined)
    assert.equal(sentPayload.proposalMessage, undefined)
    assert.equal(relay.probes.length, 0, 'provider budget exhaustion must skip chat model HTTP request')

    const aiMessage = readObject(sentPayload.aiMessage)
    assert.equal(aiMessage.kind, 'message')
    assert.equal(aiMessage.authorType, 'ai')
    assert.equal(aiMessage.failureCode, 'provider_budget_exhausted')
    assert.match(String(aiMessage.body), /token|额度/)
    assert.equal(readObject(aiMessage.metadata).source, 'chat_provider_budget_downgrade')

    const proposals = await requestJson(baseUrl, `/api/ai/players/proposals?aiPlayerId=${AI_PLAYER_ID}&limit=10`, 'GET')
    assert.equal(proposals.status, 200, `proposal list after budget exhausted chat failed: ${JSON.stringify(proposals.data)}`)
    assert.equal(readArray(readObject(proposals.data).items).length, 0)

    const failureHistory = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20&filter=failure`, 'GET')
    assert.equal(failureHistory.status, 200, `budget failure history failed: ${JSON.stringify(failureHistory.data)}`)
    const failures = readArray(readObject(failureHistory.data).messages).map((item) => readObject(item))
    assert.equal(failures.length, 1)
    assert.equal(failures[0].messageId, aiMessage.messageId)

    const chatHistory = await requestJson(
      baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20&readerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
    )
    assert.equal(chatHistory.status, 200, `budget chat history failed: ${JSON.stringify(chatHistory.data)}`)
    const chatHistoryPayload = readObject(chatHistory.data)
    const chatHistoryMessages = readArray(chatHistoryPayload.messages)
    assert.equal(chatHistoryMessages.length, 2)
    const historyCounts = readObject(chatHistoryPayload.historyCounts)
    assert.equal(historyCounts.command, 1)
    assert.equal(historyCounts.proposal, 0)
    assert.equal(historyCounts.receipt, 0)
    assert.equal(historyCounts.failure, 1)
    assert.equal(readObject(chatHistoryPayload.readCursor).unreadCount, 2)
  } finally {
    await shutdownChild(child)
    await relay.stop()
  }
}

async function testChatCommandInvalidModelOutputWritesRuleFailureMessage() {
  const relay = await startChatRelayProbe(() => '{"summary":"truncated"')
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  let child = spawnBackend(port, tail, {
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_http_chat_command_invalid_model_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_http_chat_command_invalid_model_session_state'),
    WORLD_STATE_PERSIST_PATH: seedWorldStateWithAiResourceSubaccount(),
    AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: buildSessionPersistPath('ai_player_http_chat_command_invalid_model_provider_store'),
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: relay.baseUrl,
    AI_PLAYER_RUNTIME_MODEL_API_KEY: 'chat-invalid-model-key-fixture',
    AI_PLAYER_RUNTIME_MODEL: 'chat/strict-json-model',
    AI_PLAYER_RUNTIME_MODEL_MOCK_OUTPUT: '',
    LLM_RELAY_URL: relay.baseUrl,
    LLM_RELAY_MODEL: 'chat/strict-json-model',
    LLM_RELAY_API_KEY: 'chat-invalid-model-key-fixture',
    LLM_RELAY_API_KEYS: '',
    OPENAI_API_KEY: '',
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `invalid-model backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: FACTION_ID,
      playerName: GOVERNOR_PLAYER_ID,
    })
    assert.equal(join.status, 200, `invalid-model session join failed: ${JSON.stringify(join.data)}`)

    const register = await requestJson(baseUrl, '/api/ai/players', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      displayName: '青州后勤官',
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      actionWhitelist: ['resource_transfer_to_governor'],
      budgetPolicy: {
        allowHighRiskActions: true,
      },
    })
    assert.equal(register.status, 200, `invalid-model register failed: ${JSON.stringify(register.data)}`)

    const aiCommandCreditGrant = await requestJson(baseUrl, '/api/ai/provider/ai-command-credits/grants', 'POST', {
      accountId: GOVERNOR_PLAYER_ID,
      worldId: FACTION_ID,
      amountCredits: 100,
      reason: 'chat_invalid_model_contract_grant',
    })
    assert.equal(aiCommandCreditGrant.status, 200, `invalid-model AI command credit grant failed: ${JSON.stringify(aiCommandCreditGrant.data)}`)
    assert.equal(readObject(aiCommandCreditGrant.data).ok, true)

    const worldBefore = await loadWorldState(baseUrl)
    const sent = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages`, 'POST', {
      body: `青州后勤官，输送 ${TRANSFER_WOOD} 木材到总督的通用收件箱。`,
      senderId: GOVERNOR_PLAYER_ID,
      senderName: '总督',
      createProposal: true,
    })
    assert.equal(sent.status, 200, `invalid model chat command failed: ${JSON.stringify(sent.data)}`)
    const sentPayload = readObject(sent.data)
    assert.equal(sentPayload.ok, true)
    assert.equal(sentPayload.proposal, undefined)
    assert.equal(sentPayload.proposalMessage, undefined)
    assert.equal(relay.probes.length, 3, 'invalid raw JSON should use the bounded correction retry chain')

    const aiMessage = readObject(sentPayload.aiMessage)
    assert.equal(aiMessage.kind, 'message')
    assert.equal(aiMessage.authorType, 'ai')
    assert.match(String(aiMessage.failureCode), /^model_response_invalid_json_proposal/)
    assert.match(String(aiMessage.body), /没有创建|不会执行|合规提案/)
    const metadata = readObject(aiMessage.metadata)
    assert.equal(metadata.source, 'chat_model_failure_downgrade')
    assert.equal(metadata.authorityPreserved, true)
    const recoveryHint = readObject(metadata.recoveryHint)
    assert.equal(recoveryHint.focus, 'retry')
    assert.match(String(recoveryHint.summary), /模型|JSON|重试/)
    assert.match(String(recoveryHint.recommendedCommand), /重试|检查模型/)

    const proposals = await requestJson(baseUrl, `/api/ai/players/proposals?aiPlayerId=${AI_PLAYER_ID}&limit=10`, 'GET')
    assert.equal(proposals.status, 200, `proposal list after invalid model chat failed: ${JSON.stringify(proposals.data)}`)
    assert.equal(readArray(readObject(proposals.data).items).length, 0)

    const failureHistory = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20&filter=failure`, 'GET')
    assert.equal(failureHistory.status, 200, `invalid-model failure history failed: ${JSON.stringify(failureHistory.data)}`)
    const failures = readArray(readObject(failureHistory.data).messages).map((item) => readObject(item))
    assert.equal(failures.length, 1)
    assert.equal(failures[0].messageId, aiMessage.messageId)

    const worldAfter = await loadWorldState(baseUrl)
    assert.equal(worldAfter.worldVersion, worldBefore.worldVersion, 'invalid model output must not mutate world')
  } finally {
    await shutdownChild(child)
    await relay.stop()
  }
}

async function testChatCommandModelObservationIncludesChatSummaryCheckpoint() {
  const relay = await startChatRelayProbe()
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  let child = spawnBackend(port, tail, {
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_http_chat_command_summary_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_http_chat_command_summary_session_state'),
    WORLD_STATE_PERSIST_PATH: seedWorldStateWithAiResourceSubaccount(),
    AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: buildSessionPersistPath('ai_player_http_chat_command_summary_provider_store'),
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: relay.baseUrl,
    AI_PLAYER_RUNTIME_MODEL_API_KEY: 'chat-summary-checkpoint-key-fixture',
    AI_PLAYER_RUNTIME_MODEL: 'chat/strict-json-model',
    AI_PLAYER_RUNTIME_MODEL_MOCK_OUTPUT: '',
    LLM_RELAY_URL: relay.baseUrl,
    LLM_RELAY_MODEL: 'chat/strict-json-model',
    LLM_RELAY_API_KEY: 'chat-summary-checkpoint-key-fixture',
    LLM_RELAY_API_KEYS: '',
    OPENAI_API_KEY: '',
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `summary-checkpoint backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: FACTION_ID,
      playerName: GOVERNOR_PLAYER_ID,
    })
    assert.equal(join.status, 200, `summary-checkpoint session join failed: ${JSON.stringify(join.data)}`)

    const register = await requestJson(baseUrl, '/api/ai/players', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      displayName: '青州后勤官',
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      actionWhitelist: ['resource_transfer_to_governor'],
      budgetPolicy: {
        allowHighRiskActions: true,
      },
    })
    assert.equal(register.status, 200, `summary-checkpoint register failed: ${JSON.stringify(register.data)}`)

    const aiCommandCreditGrant = await requestJson(baseUrl, '/api/ai/provider/ai-command-credits/grants', 'POST', {
      accountId: GOVERNOR_PLAYER_ID,
      worldId: FACTION_ID,
      amountCredits: 100,
      reason: 'chat_summary_checkpoint_contract_grant',
    })
    assert.equal(aiCommandCreditGrant.status, 200, `summary-checkpoint AI command credit grant failed: ${JSON.stringify(aiCommandCreditGrant.data)}`)
    assert.equal(readObject(aiCommandCreditGrant.data).ok, true)

    for (let index = 1; index <= 10; index += 1) {
      const seed = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages`, 'POST', {
        body: `checkpoint seed message ${index}`,
        senderId: GOVERNOR_PLAYER_ID,
        senderName: '总督',
        createProposal: false,
      })
      assert.equal(seed.status, 200, `summary-checkpoint seed message ${index} failed: ${JSON.stringify(seed.data)}`)
    }

    const sent = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages`, 'POST', {
      body: `青州后勤官，输送 ${TRANSFER_WOOD} 木材到总督的通用收件箱。`,
      senderId: GOVERNOR_PLAYER_ID,
      senderName: '总督',
      createProposal: true,
    })
    assert.equal(sent.status, 200, `summary-checkpoint model chat command failed: ${JSON.stringify(sent.data)}`)
    assert.equal(readObject(sent.data).ok, true)
    assert.equal(relay.requestBodies.length, 1, 'summary-checkpoint command should call the relay exactly once')

    const requestBody = readObject(JSON.parse(relay.requestBodies[0]))
    const messages = readArray(requestBody.messages)
    const userMessage = readObject(messages.find((message) => readObject(message).role === 'user'))
    const userObservation = readObject(JSON.parse(String(userMessage.content)))
    const chatSummary = readObject(userObservation.chatSummary)
    assert.equal(chatSummary.method, 'deterministic_backend_checkpoint_v1')
    assert.equal(chatSummary.sourceMessageCount, 20)
    assert.match(String(chatSummary.summary), /messages 1-20/)
    assert.match(String(chatSummary.sourceFirstMessageId), /^chat_/)
    assert.match(String(chatSummary.sourceLastMessageId), /^chat_/)

    const recentChat = readArray(userObservation.recentChat).map((item) => readObject(item))
    assert.equal(recentChat.length, 10)
    assert.equal(recentChat.at(-1)?.body, `青州后勤官，输送 ${TRANSFER_WOOD} 木材到总督的通用收件箱。`)
    assert.equal(recentChat.at(-1)?.kind, 'message')
    assert.equal(recentChat.at(-1)?.authorType, 'governor')
    assert.equal(String(relay.requestBodies[0]).includes('chat-summary-checkpoint-key-fixture'), false, 'model request body must not include provider API key')
  } finally {
    await shutdownChild(child)
    await relay.stop()
  }
}

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const worldStatePath = seedWorldStateWithAiResourceSubaccount()
  const governanceStatePath = buildSessionPersistPath('ai_player_http_chat_command_governance_state')
  const sessionStatePath = buildSessionPersistPath('ai_player_http_chat_command_session_state')
  const backendEnv = {
    AI_PLAYER_GOVERNANCE_STATE_PATH: governanceStatePath,
    SESSION_STATE_PERSIST_PATH: sessionStatePath,
    WORLD_STATE_PERSIST_PATH: worldStatePath,
    AI_PLAYER_RUNTIME_MODEL_MOCK_OUTPUT: JSON.stringify(MODEL_OUTPUT),
  }
  let child = spawnBackend(port, tail, backendEnv)

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: FACTION_ID,
      playerName: GOVERNOR_PLAYER_ID,
    })
    assert.equal(join.status, 200, `session join failed: ${JSON.stringify(join.data)}`)

    const register = await requestJson(baseUrl, '/api/ai/players', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      displayName: '青州后勤官',
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      actionWhitelist: ['resource_transfer_to_governor'],
      budgetPolicy: {
        allowHighRiskActions: true,
      },
    })
    assert.equal(register.status, 200, `register failed: ${JSON.stringify(register.data)}`)

    const registerLowResource = await requestJson(baseUrl, '/api/ai/players', 'POST', {
      aiPlayerId: LOW_RESOURCE_AI_PLAYER_ID,
      displayName: '青州见习后勤官',
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      actionWhitelist: ['resource_transfer_to_governor'],
      budgetPolicy: {
        allowHighRiskActions: true,
      },
    })
    assert.equal(registerLowResource.status, 200, `register low-resource ai failed: ${JSON.stringify(registerLowResource.data)}`)

    const channelBefore = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat?limit=20`, 'GET')
    assert.equal(channelBefore.status, 200, `chat channel before send failed: ${JSON.stringify(channelBefore.data)}`)
    const channelBeforePayload = readObject(channelBefore.data)
    assert.equal(readObject(channelBeforePayload.channel).channelId, `ai:${AI_PLAYER_ID}`)
    assert.equal(readArray(channelBeforePayload.messages).length, 0)

    const sent = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages`, 'POST', {
      body: `青州后勤官，输送 ${TRANSFER_WOOD} 木材到总督的通用收件箱。`,
      senderId: GOVERNOR_PLAYER_ID,
      senderName: '总督',
      createProposal: true,
    })
    assert.equal(sent.status, 200, `send chat command failed: ${JSON.stringify(sent.data)}`)
    const sentPayload = readObject(sent.data)
    assert.equal(sentPayload.ok, true)
    const proposal = readObject(sentPayload.proposal)
    assert.equal(proposal.aiPlayerId, AI_PLAYER_ID)
    assert.equal(proposal.action, 'resource_transfer_to_governor')
    assert.equal(proposal.source, 'llm')
    assert.equal(proposal.status, 'pending_approval')
    assert.deepEqual(readObject(proposal.args), { resources: { wood: TRANSFER_WOOD } })
    const proposalRecoveryHint = readObject(proposal.recoveryHint)
    assert.equal(proposalRecoveryHint.focus, 'approval')
    assert.match(String(proposalRecoveryHint.summary), /批准/)
    const proposalMessage = readObject(sentPayload.proposalMessage)
    assert.equal(proposalMessage.kind, 'proposal')
    assert.equal(proposalMessage.proposalId, proposal.proposalId)

    const proposalId = String(proposal.proposalId)
    const chatAfterProposal = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20`, 'GET')
    assert.equal(chatAfterProposal.status, 200, `chat channel after proposal failed: ${JSON.stringify(chatAfterProposal.data)}`)
    const afterProposalMessages = readArray(readObject(chatAfterProposal.data).messages).map((item) => readObject(item))
    assert.ok(afterProposalMessages.some((item) => item.kind === 'message' && item.authorType === 'governor'))
    assert.ok(afterProposalMessages.some((item) => item.kind === 'proposal' && item.proposalId === proposalId))
    const afterProposalCounts = readObject(readObject(chatAfterProposal.data).historyCounts)
    assert.equal(afterProposalCounts.command, 1)
    assert.equal(afterProposalCounts.proposal, 1)

    const commandHistory = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20&filter=command`, 'GET')
    assert.equal(commandHistory.status, 200, `chat command history failed: ${JSON.stringify(commandHistory.data)}`)
    const commandHistoryPayload = readObject(commandHistory.data)
    assert.equal(commandHistoryPayload.filter, 'command')
    const commandMessages = readArray(commandHistoryPayload.messages).map((item) => readObject(item))
    assert.equal(commandMessages.length, 1)
    assert.equal(commandMessages[0].kind, 'message')
    assert.equal(commandMessages[0].authorType, 'governor')

    const proposalHistory = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20&filter=proposal`, 'GET')
    assert.equal(proposalHistory.status, 200, `chat proposal history failed: ${JSON.stringify(proposalHistory.data)}`)
    const proposalHistoryPayload = readObject(proposalHistory.data)
    assert.equal(proposalHistoryPayload.filter, 'proposal')
    const proposalMessages = readArray(proposalHistoryPayload.messages).map((item) => readObject(item))
    assert.equal(proposalMessages.length, 1)
    assert.equal(proposalMessages[0].proposalId, proposalId)

    const invalidHistoryFilter = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?filter=debug`, 'GET')
    assert.equal(invalidHistoryFilter.status, 422)

    const unreadAfterProposal = await requestJson(
      baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20&readerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
    )
    assert.equal(unreadAfterProposal.status, 200, `chat channel unread failed: ${JSON.stringify(unreadAfterProposal.data)}`)
    const unreadAfterProposalPayload = readObject(unreadAfterProposal.data)
    assert.equal(readObject(unreadAfterProposalPayload.readCursor).unreadCount, afterProposalMessages.length)

    const markReadAfterProposal = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/read-cursor`, 'POST', {
      readerId: GOVERNOR_PLAYER_ID,
      readMessageCount: afterProposalMessages.length,
    })
    assert.equal(markReadAfterProposal.status, 200, `chat read cursor update failed: ${JSON.stringify(markReadAfterProposal.data)}`)
    const markedCursor = readObject(readObject(markReadAfterProposal.data).readCursor)
    assert.equal(markedCursor.readMessageCount, afterProposalMessages.length)
    assert.equal(markedCursor.unreadCount, 0)

    const approve = await requestJson(baseUrl, `/api/ai/players/proposals/${proposalId}/approve`, 'POST', {
      approvedBy: GOVERNOR_PLAYER_ID,
    })
    assert.equal(approve.status, 200, `approve chat proposal failed: ${JSON.stringify(approve.data)}`)

    const execute = await requestJson(baseUrl, `/api/ai/players/proposals/${proposalId}/execute`, 'POST', {
      executedBy: GOVERNOR_PLAYER_ID,
      includeWorld: false,
    }, 60_000)
    assert.equal(execute.status, 200, `execute chat proposal failed: ${JSON.stringify(execute.data)}`)
    const executePayload = readObject(execute.data)
    const receipt = readObject(executePayload.receipt)
    assert.equal(receipt.ok, true)
    assert.equal(receipt.worldAction, 'transferFactionResourcesToGovernor')
    assert.equal(receipt.failureCode, null)
    const receiptRecoveryHint = readObject(receipt.recoveryHint)
    assert.equal(receiptRecoveryHint.focus, 'inbox')
    assert.match(String(receiptRecoveryHint.summary), /通用收件箱/)
    const executedProposal = readObject(executePayload.proposal)
    assert.equal(readObject(executedProposal.recoveryHint).focus, 'inbox')
    const receiptChatMessage = readObject(executePayload.chatMessage)
    assert.equal(receiptChatMessage.kind, 'receipt')
    assert.equal(receiptChatMessage.authorType, 'ai')
    assert.equal(receiptChatMessage.authorName, '青州后勤官')
    assert.match(String(receiptChatMessage.body), /总督/)
    assert.doesNotMatch(String(receiptChatMessage.body), /大哥/)
    assert.doesNotMatch(String(receiptChatMessage.body), /^执行成功：/)
    assert.equal(receiptChatMessage.receiptProposalId, proposalId)
    assert.equal(receiptChatMessage.receiptOk, true)
    const receiptChatMetadata = readObject(receiptChatMessage.metadata)
    aiPlayerReceiptChatMetadataSchema.parse(receiptChatMetadata)
    assert.equal(receiptChatMetadata.messageStyle, 'ai_player_emotional_receipt_v1')
    assert.equal('worldActionPayload' in receiptChatMetadata, false, 'receipt chat metadata must not expose raw world action payload')
    assert.deepEqual(readObject(receiptChatMetadata.receiptNarrative), {
      styleVersion: 'ai_player_emotional_receipt_v1',
      outcome: 'success',
      action: 'resource_transfer_to_governor',
      worldAction: 'transferFactionResourcesToGovernor',
      authorityPreserved: true,
    })
    assert.deepEqual(readObject(receiptChatMetadata.addressing), {
      value: '总督',
      source: 'neutral_fallback',
    })
    assert.equal(readObject(receiptChatMetadata.recoveryHint).focus, 'inbox')

    const chatAfterReceipt = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20`, 'GET')
    assert.equal(chatAfterReceipt.status, 200, `chat channel after receipt failed: ${JSON.stringify(chatAfterReceipt.data)}`)
    const chatAfterReceiptPayload = readObject(chatAfterReceipt.data)
    const afterReceiptMessages = readArray(chatAfterReceiptPayload.messages).map((item) => readObject(item))
    assert.ok(
      afterReceiptMessages.some((item) => item.kind === 'receipt' && item.receiptProposalId === proposalId),
      'chat flow should include execute receipt writeback',
    )
    const afterReceiptCounts = readObject(chatAfterReceiptPayload.historyCounts)
    assert.equal(afterReceiptCounts.all, afterReceiptMessages.length)
    assert.equal(afterReceiptCounts.receipt, 1)
    assert.equal(afterReceiptCounts.failure, 0)

    const latestPage = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=2`, 'GET')
    assert.equal(latestPage.status, 200, `chat latest page failed: ${JSON.stringify(latestPage.data)}`)
    const latestPagePayload = readObject(latestPage.data)
    assert.equal(latestPagePayload.hasMore, true)
    const latestPageMessages = readArray(latestPagePayload.messages).map((item) => readObject(item))
    assert.equal(latestPageMessages.length, 2)
    assert.equal(latestPageMessages[0].kind, 'proposal')
    assert.equal(latestPageMessages[1].kind, 'receipt')
    const nextBeforeMessageId = String(latestPagePayload.nextBeforeMessageId)
    assert.equal(nextBeforeMessageId, String(latestPageMessages[0].messageId))
    const previousPage = await requestJson(
      baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=2&beforeMessageId=${encodeURIComponent(nextBeforeMessageId)}`,
      'GET',
    )
    assert.equal(previousPage.status, 200, `chat previous page failed: ${JSON.stringify(previousPage.data)}`)
    const previousPagePayload = readObject(previousPage.data)
    assert.equal(previousPagePayload.beforeMessageId, nextBeforeMessageId)
    assert.equal(previousPagePayload.hasMore, false)
    const previousPageMessages = readArray(previousPagePayload.messages).map((item) => readObject(item))
    assert.equal(previousPageMessages.length, 1)
    assert.equal(previousPageMessages[0].kind, 'message')
    assert.equal(previousPageMessages[0].authorType, 'governor')

    const invalidCursorPage = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?beforeMessageId=missing_chat_message`, 'GET')
    assert.equal(invalidCursorPage.status, 409)

    const receiptHistory = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20&filter=receipt`, 'GET')
    assert.equal(receiptHistory.status, 200, `chat receipt history failed: ${JSON.stringify(receiptHistory.data)}`)
    const receiptMessages = readArray(readObject(receiptHistory.data).messages).map((item) => readObject(item))
    assert.equal(receiptMessages.length, 1)
    assert.equal(receiptMessages[0].kind, 'receipt')
    const failureHistory = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20&filter=failure`, 'GET')
    assert.equal(failureHistory.status, 200, `chat failure history failed: ${JSON.stringify(failureHistory.data)}`)
    assert.equal(readArray(readObject(failureHistory.data).messages).length, 0)
    const cursorAfterReceipt = await requestJson(
      baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/read-cursor?readerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
    )
    assert.equal(cursorAfterReceipt.status, 200, `chat read cursor after receipt failed: ${JSON.stringify(cursorAfterReceipt.data)}`)
    const cursorAfterReceiptPayload = readObject(cursorAfterReceipt.data)
    assert.equal(readObject(cursorAfterReceiptPayload.readCursor).unreadCount, afterReceiptMessages.length - afterProposalMessages.length)

    const worldAfterTransfer = await loadWorldState(baseUrl)
    const factionAfterTransfer = readObject(readObject(worldAfterTransfer.factions)[FACTION_ID])
    const accountAfterTransfer = readObject(readObject(factionAfterTransfer.aiResourceAccounts)[AI_PLAYER_ID])
    assert.equal(readObject(accountAfterTransfer.resources).wood, 40 - TRANSFER_WOOD)
    const inbox = readObject(readObject(factionAfterTransfer.governorResourceInboxes)[GOVERNOR_PLAYER_ID])
    assert.equal(readArray(inbox.pendingTransfers).length, 1)
    assert.equal(readObject(inbox.totalPendingResources).wood, TRANSFER_WOOD)

    await new Promise((resolve) => setTimeout(resolve, 1_500))
    await shutdownChild(child)
    child = spawnBackend(port, tail, backendEnv)
    const restartedHealth = await waitForHealth(baseUrl)
    assert.ok(restartedHealth, `backend did not restart with governance cursor state\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)
    const cursorAfterRestart = await requestJson(
      baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat/read-cursor?readerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
    )
    assert.equal(cursorAfterRestart.status, 200, `chat read cursor after restart failed: ${JSON.stringify(cursorAfterRestart.data)}`)
    const cursorAfterRestartPayload = readObject(cursorAfterRestart.data)
    assert.equal(readObject(cursorAfterRestartPayload.readCursor).readMessageCount, afterProposalMessages.length)
    assert.equal(readObject(cursorAfterRestartPayload.readCursor).unreadCount, afterReceiptMessages.length - afterProposalMessages.length)

    const pendingDirectProposal = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      action: 'resource_transfer_to_governor',
      args: {
        resources: {
          wood: 1,
        },
      },
      reason: 'direct test proposal should not execute before approval',
      source: 'human',
    })
    assert.equal(pendingDirectProposal.status, 200, `create pending direct proposal failed: ${JSON.stringify(pendingDirectProposal.data)}`)
    const pendingProposal = readObject(readObject(pendingDirectProposal.data).proposal)
    const executeBeforeApproval = await requestJson(baseUrl, `/api/ai/players/proposals/${String(pendingProposal.proposalId)}/execute`, 'POST', {
      executedBy: GOVERNOR_PLAYER_ID,
      includeWorld: false,
    }, 60_000)
    assert.equal(executeBeforeApproval.status, 409, `execute-before-approval should fail structurally: ${JSON.stringify(executeBeforeApproval.data)}`)
    const executeBeforeApprovalPayload = readObject(executeBeforeApproval.data)
    assert.equal(executeBeforeApprovalPayload.ok, false)
    assert.equal(executeBeforeApprovalPayload.failureCode, 'proposal_not_approved')
    assert.equal(readObject(executeBeforeApprovalPayload.recoveryHint).focus, 'approval')
    const executeBeforeApprovalChatMessage = readObject(executeBeforeApprovalPayload.chatMessage)
    assert.equal(executeBeforeApprovalChatMessage.kind, 'receipt')
    assert.equal(executeBeforeApprovalChatMessage.authorType, 'ai')
    assert.equal(executeBeforeApprovalChatMessage.receiptOk, false)
    assert.equal(executeBeforeApprovalChatMessage.failureCode, 'proposal_not_approved')

    const cooldownPrimerCreate = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      action: 'resource_transfer_to_governor',
      args: {
        resources: {
          wood: 1,
        },
      },
      reason: 'prime cooldown for deterministic cooldown failure',
      source: 'human',
    })
    assert.equal(cooldownPrimerCreate.status, 200, `create cooldown primer failed: ${JSON.stringify(cooldownPrimerCreate.data)}`)
    const cooldownPrimer = readObject(readObject(cooldownPrimerCreate.data).proposal)
    const approveCooldownPrimer = await requestJson(baseUrl, `/api/ai/players/proposals/${String(cooldownPrimer.proposalId)}/approve`, 'POST', {
      approvedBy: GOVERNOR_PLAYER_ID,
    })
    assert.equal(approveCooldownPrimer.status, 200, `approve cooldown primer failed: ${JSON.stringify(approveCooldownPrimer.data)}`)
    const executeCooldownPrimer = await requestJson(baseUrl, `/api/ai/players/proposals/${String(cooldownPrimer.proposalId)}/execute`, 'POST', {
      executedBy: GOVERNOR_PLAYER_ID,
      includeWorld: false,
    }, 60_000)
    assert.equal(executeCooldownPrimer.status, 200, `execute cooldown primer route failed: ${JSON.stringify(executeCooldownPrimer.data)}`)
    assert.equal(readObject(readObject(executeCooldownPrimer.data).receipt).ok, true)

    const cooldownProposalCreate = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      action: 'resource_transfer_to_governor',
      args: {
        resources: {
          wood: 1,
        },
      },
      reason: 'second transfer should be blocked by cooldown',
      source: 'human',
    })
    assert.equal(cooldownProposalCreate.status, 200, `create cooldown proposal failed: ${JSON.stringify(cooldownProposalCreate.data)}`)
    const cooldownProposal = readObject(readObject(cooldownProposalCreate.data).proposal)
    const approveCooldownProposal = await requestJson(baseUrl, `/api/ai/players/proposals/${String(cooldownProposal.proposalId)}/approve`, 'POST', {
      approvedBy: GOVERNOR_PLAYER_ID,
    })
    assert.equal(approveCooldownProposal.status, 200, `approve cooldown proposal failed: ${JSON.stringify(approveCooldownProposal.data)}`)
    const executeCooldownProposal = await requestJson(baseUrl, `/api/ai/players/proposals/${String(cooldownProposal.proposalId)}/execute`, 'POST', {
      executedBy: GOVERNOR_PLAYER_ID,
      includeWorld: false,
    }, 60_000)
    assert.equal(executeCooldownProposal.status, 200, `execute cooldown proposal route failed: ${JSON.stringify(executeCooldownProposal.data)}`)
    const cooldownReceipt = readObject(readObject(executeCooldownProposal.data).receipt)
    assert.equal(cooldownReceipt.ok, false)
    assert.equal(cooldownReceipt.failureCode, 'transfer_cooldown_active')
    assert.equal(readObject(cooldownReceipt.recoveryHint).focus, 'cooldown')
    assert.equal(readObject(readObject(executeCooldownProposal.data).chatMessage).failureCode, 'transfer_cooldown_active')

    const listAfterCooldownFailure = await requestJson(baseUrl, `/api/ai/players?governorPlayerId=${GOVERNOR_PLAYER_ID}`, 'GET')
    assert.equal(listAfterCooldownFailure.status, 200, `runtime list after cooldown failure failed: ${JSON.stringify(listAfterCooldownFailure.data)}`)
    const runtimeAfterCooldownFailure = readArray(readObject(listAfterCooldownFailure.data).items)
      .map((item) => readObject(item))
      .find((item) => item.aiPlayerId === AI_PLAYER_ID)
    assert.ok(runtimeAfterCooldownFailure, 'runtime list should still include failed AI player')
    const cooldownListCard = readObject(runtimeAfterCooldownFailure.listCard)
    assert.equal(cooldownListCard.statusDot, 'red')
    assert.equal(cooldownListCard.statusReason, 'runtime_failure')
    assert.equal(cooldownListCard.playerRuntimeLastError, 'transfer_cooldown_active')
    const cooldownListCardReceipt = readObject(cooldownListCard.runtimeFailureReceipt)
    assert.equal(cooldownListCardReceipt.proposalId, cooldownProposal.proposalId)
    assert.equal(cooldownListCardReceipt.action, 'resource_transfer_to_governor')
    assert.equal(cooldownListCardReceipt.failureCode, 'transfer_cooldown_active')
    assert.equal(typeof cooldownListCardReceipt.observedAt, 'string')
    assert.equal(readObject(cooldownListCardReceipt.recoveryHint).focus, 'cooldown')
    assert.equal('execution' in cooldownListCardReceipt, false, 'listCard failure receipt must not expose raw execution payload')
    assert.equal('worldActionPayload' in cooldownListCardReceipt, false, 'listCard failure receipt must not expose action payload')

    const insufficientProposalCreate = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: LOW_RESOURCE_AI_PLAYER_ID,
      action: 'resource_transfer_to_governor',
      args: {
        resources: {
          wood: 3,
        },
      },
      reason: 'low-resource AI should explain insufficient resource failure',
      source: 'human',
    })
    assert.equal(insufficientProposalCreate.status, 200, `create insufficient proposal failed: ${JSON.stringify(insufficientProposalCreate.data)}`)
    const insufficientProposal = readObject(readObject(insufficientProposalCreate.data).proposal)
    const approveInsufficientProposal = await requestJson(baseUrl, `/api/ai/players/proposals/${String(insufficientProposal.proposalId)}/approve`, 'POST', {
      approvedBy: GOVERNOR_PLAYER_ID,
    })
    assert.equal(approveInsufficientProposal.status, 200, `approve insufficient proposal failed: ${JSON.stringify(approveInsufficientProposal.data)}`)
    const executeInsufficientProposal = await requestJson(baseUrl, `/api/ai/players/proposals/${String(insufficientProposal.proposalId)}/execute`, 'POST', {
      executedBy: GOVERNOR_PLAYER_ID,
      includeWorld: false,
    }, 60_000)
    assert.equal(executeInsufficientProposal.status, 200, `execute insufficient proposal route failed: ${JSON.stringify(executeInsufficientProposal.data)}`)
    const insufficientReceipt = readObject(readObject(executeInsufficientProposal.data).receipt)
    assert.equal(insufficientReceipt.ok, false)
    assert.equal(insufficientReceipt.failureCode, 'insufficient_resources')
    assert.equal(readObject(insufficientReceipt.recoveryHint).focus, 'resources')
    assert.match(String(readObject(insufficientReceipt.recoveryHint).summary), /资源不足/)
    const insufficientChatMessage = readObject(readObject(executeInsufficientProposal.data).chatMessage)
    assert.equal(insufficientChatMessage.kind, 'receipt')
    assert.equal(insufficientChatMessage.authorType, 'ai')
    assert.equal(insufficientChatMessage.authorName, '青州见习后勤官')
    assert.equal(insufficientChatMessage.receiptOk, false)
    assert.equal(insufficientChatMessage.failureCode, 'insufficient_resources')

    const failureHistoryAfterFailureReceipts = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20&filter=failure`, 'GET')
    assert.equal(failureHistoryAfterFailureReceipts.status, 200, `chat failure history after failure receipts failed: ${JSON.stringify(failureHistoryAfterFailureReceipts.data)}`)
    assert.ok(readArray(readObject(failureHistoryAfterFailureReceipts.data).messages).length >= 2)
    const lowResourceFailureHistory = await requestJson(baseUrl, `/api/ai/players/${LOW_RESOURCE_AI_PLAYER_ID}/chat/messages?limit=20&filter=failure`, 'GET')
    assert.equal(lowResourceFailureHistory.status, 200, `low-resource failure history failed: ${JSON.stringify(lowResourceFailureHistory.data)}`)
    assert.equal(readArray(readObject(lowResourceFailureHistory.data).messages).length, 1)

    await testChatCommandEmptyModelProposalsWritesIdleSummary()
    await testChatCommandInvalidModelOutputWritesRuleFailureMessage()
    await testChatCommandBudgetExhaustedWritesRuleMessage()
    await testChatCommandModelObservationIncludesChatSummaryCheckpoint()
    await testChatCommandApprovesAndRejectsLatestPendingProposalByNaturalLanguage()
    await testChatCommandRoutesHeroLevelPreferenceToResourceLandExperience()
    await testChatCommandUsesExplicitUpgradeTargetPreference()
    console.log('[ai_player_http_chat_command_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[ai_player_http_chat_command_contract] failed:', error)
  process.exitCode = 1
})
