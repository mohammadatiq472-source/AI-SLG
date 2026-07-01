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
    protocol: 'openai_compat'
    hasKey: boolean
    secretSources: string[]
    secretPolicy: 'env_only_no_file_no_echo'
  }
  checks: GateCheck[]
  summary: Record<string, unknown>
  failure?: Record<string, unknown>
  reportPath?: string
  stampedReportPath?: string
}

const AI_PLAYER_ID = 'player_operator_live_chat_e2e'
const FACTION_ID = 'player'
const GOVERNOR_PLAYER_ID = 'human_alpha'
const TRANSFER_WOOD = 11
const LATEST_REPORT_PATH = join(process.cwd(), 'tmp', 'gates', 'ai_player_live_chat_e2e_gate_latest.json')
const SECRET_ENV_NAME = 'AI_PLAYER_RUNTIME_MODEL_API_KEY'

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

function pushCheck(checks: GateCheck[], name: string, passed: boolean, details?: Record<string, unknown>) {
  checks.push({ name, passed, details })
}

function seedWorldStateWithAiResourceSubaccount() {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding live AI chat shard`)
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: '青州后勤官',
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
  }
  faction.aiResourceTransferPolicy = {
    cooldownTicks: 10_000,
  }
  faction.governorResourceInboxes = {}

  const path = buildSessionPersistPath('ai_player_live_chat_e2e_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return path
}

async function loadWorldState(baseUrl: string) {
  const worldResult = await requestJson(baseUrl, '/api/world?intelMode=full', 'GET', undefined, 30_000)
  assert.equal(worldResult.status, 200, `world route failed: ${JSON.stringify(worldResult.data)}`)
  return readObject(readObject(worldResult.data).world)
}

async function runGate() {
  const apiKey = process.env[SECRET_ENV_NAME]?.trim()
  const baseModelUrl = process.env.AI_PLAYER_RUNTIME_MODEL_BASE_URL?.trim() || 'https://api.deepseek.com'
  const model = process.env.AI_PLAYER_RUNTIME_MODEL?.trim() || 'deepseek-v4-flash'
  const checks: GateCheck[] = []
  const summary: Record<string, unknown> = {}
  const reportBase = {
    generatedAt: new Date().toISOString(),
    target: {
      host: targetHost(baseModelUrl),
      model,
      protocol: 'openai_compat' as const,
      hasKey: Boolean(apiKey),
      secretSources: apiKey ? [SECRET_ENV_NAME] : [],
      secretPolicy: 'env_only_no_file_no_echo' as const,
    },
    checks,
    summary,
  }

  pushCheck(checks, 'api_key_available', Boolean(apiKey), { source: SECRET_ENV_NAME })
  assert.ok(apiKey, `${SECRET_ENV_NAME} is required`)

  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const worldStatePath = seedWorldStateWithAiResourceSubaccount()
  const governanceStatePath = buildSessionPersistPath('ai_player_live_chat_e2e_governance_state')
  const sessionStatePath = buildSessionPersistPath('ai_player_live_chat_e2e_session_state')
  const providerAccountStatePath = buildSessionPersistPath('ai_player_live_chat_e2e_provider_account_state')
  const child = spawnBackend(port, tail, {
    AI_PLAYER_GOVERNANCE_STATE_PATH: governanceStatePath,
    SESSION_STATE_PERSIST_PATH: sessionStatePath,
    WORLD_STATE_PERSIST_PATH: worldStatePath,
    AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH: providerAccountStatePath,
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: baseModelUrl,
    AI_PLAYER_RUNTIME_MODEL: model,
    AI_PLAYER_RUNTIME_MODEL_API_KEY: apiKey,
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
      reason: 'live_chat_e2e_gate',
    })
    pushCheck(checks, 'ai_command_credit_grant', grant.status === 200, { status: grant.status })
    assert.equal(grant.status, 200, `credit grant failed: ${JSON.stringify(grant.data)}`)

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
    pushCheck(checks, 'ai_player_registered', register.status === 200, { status: register.status })
    assert.equal(register.status, 200, `register failed: ${JSON.stringify(register.data)}`)

    const sent = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages`, 'POST', {
      body: `青州后勤官，请把 ${TRANSFER_WOOD} 木材输送到总督的通用收件箱。只创建 resource_transfer_to_governor 提案，args 必须是 {"resources":{"wood":${TRANSFER_WOOD}}}。`,
      senderId: GOVERNOR_PLAYER_ID,
      senderName: '总督',
      createProposal: true,
    }, 90_000)
    pushCheck(checks, 'live_chat_message_created_proposal', sent.status === 200, { status: sent.status })
    assert.equal(sent.status, 200, `send live chat command failed: ${JSON.stringify(sent.data)}`)
    const sentPayload = readObject(sent.data)
    assert.equal(sentPayload.ok, true)
    const proposal = readObject(sentPayload.proposal)
    const proposalArgs = readObject(proposal.args)
    const proposalResources = readObject(proposalArgs.resources)
    summary.proposalId = String(proposal.proposalId)
    summary.proposalAction = proposal.action
    summary.proposalSource = proposal.source
    summary.proposalArgs = proposalArgs
    pushCheck(checks, 'proposal_action_whitelisted', proposal.action === 'resource_transfer_to_governor', {
      action: proposal.action,
    })
    assert.equal(proposal.action, 'resource_transfer_to_governor')
    pushCheck(checks, 'proposal_source_llm', proposal.source === 'llm', { source: proposal.source })
    assert.equal(proposal.source, 'llm')
    pushCheck(checks, 'proposal_pending_approval', proposal.status === 'pending_approval', { status: proposal.status })
    assert.equal(proposal.status, 'pending_approval')
    pushCheck(checks, 'proposal_args_exact_transfer', proposalResources.wood === TRANSFER_WOOD, {
      wood: proposalResources.wood,
    })
    assert.equal(proposalResources.wood, TRANSFER_WOOD)

    const proposalId = String(proposal.proposalId)
    const approve = await requestJson(baseUrl, `/api/ai/players/proposals/${proposalId}/approve`, 'POST', {
      approvedBy: GOVERNOR_PLAYER_ID,
    })
    pushCheck(checks, 'proposal_approved', approve.status === 200, { status: approve.status })
    assert.equal(approve.status, 200, `approve live proposal failed: ${JSON.stringify(approve.data)}`)

    const execute = await requestJson(baseUrl, `/api/ai/players/proposals/${proposalId}/execute`, 'POST', {
      executedBy: GOVERNOR_PLAYER_ID,
      includeWorld: false,
    }, 60_000)
    pushCheck(checks, 'proposal_executed', execute.status === 200, { status: execute.status })
    assert.equal(execute.status, 200, `execute live proposal failed: ${JSON.stringify(execute.data)}`)
    const executePayload = readObject(execute.data)
    const receipt = readObject(executePayload.receipt)
    summary.receiptWorldAction = receipt.worldAction
    summary.receiptOk = receipt.ok
    summary.receiptFailureCode = receipt.failureCode
    pushCheck(checks, 'receipt_success', receipt.ok === true, {
      worldAction: receipt.worldAction,
      failureCode: receipt.failureCode,
    })
    assert.equal(receipt.ok, true)
    pushCheck(checks, 'receipt_world_action_transfer', receipt.worldAction === 'transferFactionResourcesToGovernor', {
      worldAction: receipt.worldAction,
    })
    assert.equal(receipt.worldAction, 'transferFactionResourcesToGovernor')
    assert.equal(receipt.failureCode, null)

    const receiptChatMessage = readObject(executePayload.chatMessage)
    pushCheck(checks, 'execute_wrote_chat_receipt', receiptChatMessage.kind === 'receipt' && receiptChatMessage.receiptProposalId === proposalId, {
      kind: receiptChatMessage.kind,
      receiptProposalId: receiptChatMessage.receiptProposalId,
    })
    assert.equal(receiptChatMessage.kind, 'receipt')
    assert.equal(receiptChatMessage.receiptProposalId, proposalId)

    const receiptHistory = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=20&filter=receipt`, 'GET')
    assert.equal(receiptHistory.status, 200, `receipt history failed: ${JSON.stringify(receiptHistory.data)}`)
    const receiptMessages = readArray(readObject(receiptHistory.data).messages).map((item) => readObject(item))
    const chatReceiptFound = receiptMessages.some((item) => item.kind === 'receipt' && item.receiptProposalId === proposalId)
    summary.chatReceiptFound = chatReceiptFound
    pushCheck(checks, 'receipt_history_contains_receipt', chatReceiptFound, { receiptCount: receiptMessages.length })
    assert.ok(chatReceiptFound, 'chat receipt history should include executed receipt')

    const receipts = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/receipts?limit=20`, 'GET')
    assert.equal(receipts.status, 200, `receipt log failed: ${JSON.stringify(receipts.data)}`)
    const receiptsPayload = readObject(receipts.data)
    const receiptItems = readArray(receiptsPayload.receipts ?? receiptsPayload.items ?? []).map((item) => readObject(item))
    const receiptLogFound = receiptItems.some((item) => item.proposalId === proposalId && item.worldAction === 'transferFactionResourcesToGovernor')
    summary.receiptLogFound = receiptLogFound
    pushCheck(checks, 'runtime_receipt_log_contains_receipt', receiptLogFound, { receiptCount: receiptItems.length })
    assert.ok(receiptLogFound, 'runtime receipt log should include executed receipt')

    const worldAfterTransfer = await loadWorldState(baseUrl)
    const factionAfterTransfer = readObject(readObject(worldAfterTransfer.factions)[FACTION_ID])
    const accountAfterTransfer = readObject(readObject(factionAfterTransfer.aiResourceAccounts)[AI_PLAYER_ID])
    const remainingWood = readObject(accountAfterTransfer.resources).wood
    const inbox = readObject(readObject(factionAfterTransfer.governorResourceInboxes)[GOVERNOR_PLAYER_ID])
    const pendingWood = readObject(inbox.totalPendingResources).wood
    summary.remainingAiWood = remainingWood
    summary.pendingInboxWood = pendingWood
    pushCheck(checks, 'world_mutation_ai_resources_debited', remainingWood === 40 - TRANSFER_WOOD, { remainingWood })
    assert.equal(remainingWood, 40 - TRANSFER_WOOD)
    pushCheck(checks, 'world_mutation_governor_inbox_credited', pendingWood === TRANSFER_WOOD, { pendingWood })
    assert.equal(pendingWood, TRANSFER_WOOD)

    const proposals = await requestJson(baseUrl, `/api/ai/players/proposals?aiPlayerId=${AI_PLAYER_ID}&limit=20`, 'GET')
    assert.equal(proposals.status, 200, `proposal list failed: ${JSON.stringify(proposals.data)}`)
    const proposalItems = readArray(readObject(proposals.data).items).map((item) => readObject(item))
    const directHeroUpgradeFound = proposalItems.some((item) => item.action === 'upgradeHeroLevel' || item.action === 'hero_level_upgrade')
    summary.directHeroUpgradeFound = directHeroUpgradeFound
    pushCheck(checks, 'no_direct_hero_level_upgrade_action', directHeroUpgradeFound === false, {
      proposalActions: proposalItems.map((item) => item.action),
    })
    assert.equal(directHeroUpgradeFound, false)

    writeReport({
      ok: true,
      status: 'pass',
      ...reportBase,
    })
    console.log(`[AI Player Live Chat E2E Gate] ok=true proposalId=${proposalId} receiptWorldAction=${String(receipt.worldAction)} latest=${LATEST_REPORT_PATH}`)
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
  console.error(`[AI Player Live Chat E2E Gate] failed: ${sanitizeError(error).message}`)
  process.exitCode = 1
})
