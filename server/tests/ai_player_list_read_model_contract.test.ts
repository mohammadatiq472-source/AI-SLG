import assert from 'node:assert/strict'
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

async function registerAiPlayer(baseUrl: string, aiPlayerId: string, displayName: string, overrides: Record<string, unknown> = {}) {
  const response = await requestJson(baseUrl, '/api/ai/players', 'POST', {
    aiPlayerId,
    displayName,
    governorPlayerId: 'human_alpha',
    factionId: 'player',
    actionWhitelist: ['recruit_pool_select', 'battle_report_read'],
    ...overrides,
  })
  assert.equal(response.status, 200, `register ${aiPlayerId} failed: ${JSON.stringify(response.data)}`)
}

function indexByAiPlayerId(items: unknown[]) {
  return new Map(items.map((item) => {
    const player = readObject(item)
    return [String(player.aiPlayerId), player] as const
  }))
}

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_list_read_model_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_list_read_model_session_state'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    await registerAiPlayer(baseUrl, 'list_alpha', 'List Alpha', {
      avatarId: 'alpha_avatar',
      avatarImagePath: 'res://assets/portraits/ai_chat/alpha_avatar.png',
    })
    await registerAiPlayer(baseUrl, 'list_beta', 'List Beta')
    await registerAiPlayer(baseUrl, 'list_gamma', 'List Gamma')
    await registerAiPlayer(baseUrl, 'list_delta', 'List Delta', {
      actionWhitelist: ['resource_transfer_to_governor', 'battle_report_read'],
      budgetPolicy: {
        allowHighRiskActions: true,
      },
    })
    await registerAiPlayer(baseUrl, 'list_enemy', 'List Enemy', {
      factionId: 'enemy',
    })

    const betaProposal = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: 'list_beta',
      action: 'recruit_pool_select',
      source: 'mcp',
      reason: 'List read model should surface pending approval state',
      args: {
        poolId: 'pool_season',
      },
    })
    assert.equal(betaProposal.status, 200, `create beta proposal failed: ${JSON.stringify(betaProposal.data)}`)

    const pauseGamma = await requestJson(baseUrl, '/api/ai/players/list_gamma/pause', 'POST', {
      updatedBy: 'human_alpha',
    })
    assert.equal(pauseGamma.status, 200, `pause gamma failed: ${JSON.stringify(pauseGamma.data)}`)

    const deltaProposal = await requestJson(baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: 'list_delta',
      action: 'resource_transfer_to_governor',
      source: 'mcp',
      reason: 'List read model should surface latest failed receipt as red state',
      args: {
        resources: {
          food: 999999,
        },
      },
    })
    assert.equal(deltaProposal.status, 200, `create delta proposal failed: ${JSON.stringify(deltaProposal.data)}`)
    const deltaProposalId = String(readObject(readObject(deltaProposal.data).proposal).proposalId)

    const approveDeltaProposal = await requestJson(baseUrl, `/api/ai/players/proposals/${deltaProposalId}/approve`, 'POST', {
      approvedBy: 'human_alpha',
    })
    assert.equal(approveDeltaProposal.status, 200, `approve delta proposal failed: ${JSON.stringify(approveDeltaProposal.data)}`)

    const executeDeltaProposal = await requestJson(baseUrl, `/api/ai/players/proposals/${deltaProposalId}/execute`, 'POST', {
      executedBy: 'human_alpha',
      includeWorld: false,
    })
    assert.equal(executeDeltaProposal.status, 200, `execute delta proposal failed: ${JSON.stringify(executeDeltaProposal.data)}`)
    const deltaReceipt = readObject(readObject(executeDeltaProposal.data).receipt)
    assert.equal(deltaReceipt.ok, false, 'delta receipt should fail so listCard can expose red state')
    assert.equal(deltaReceipt.failureCode, 'transfer_limit_exceeded')

    const listPlayers = await requestJson(baseUrl, '/api/ai/players?governorPlayerId=human_alpha&factionId=player', 'GET')
    assert.equal(listPlayers.status, 200, `list players failed: ${JSON.stringify(listPlayers.data)}`)
    const payload = readObject(listPlayers.data)
    const players = readArray(payload.items)
    assert.equal(payload.count, 4, 'same-faction list should include all governed AI players and exclude other factions')

    const byId = indexByAiPlayerId(players)
    const alpha = readObject(byId.get('list_alpha'))
    const beta = readObject(byId.get('list_beta'))
    const gamma = readObject(byId.get('list_gamma'))
    const delta = readObject(byId.get('list_delta'))

    const alphaCard = readObject(alpha.listCard)
    assert.equal(alphaCard.aiPlayerId, 'list_alpha')
    assert.equal(alphaCard.displayName, 'List Alpha')
    assert.equal(alphaCard.avatarId, 'alpha_avatar')
    assert.equal(alphaCard.avatarImagePath, 'res://assets/portraits/ai_chat/alpha_avatar.png')
    assert.equal(alphaCard.statusDot, 'green')
    assert.equal(alphaCard.statusReason, 'active')
    assert.equal(alphaCard.actionableProposalCount, 0)
    assert.equal(alphaCard.playerRuntimeLastError, null)
    assert.equal(alphaCard.viewActionId, 'ai_player_view:list_alpha')
    assert.equal(alphaCard.observedWorldPath, '/api/world?asAiPlayerId=list_alpha&governorPlayerId=human_alpha')

    const betaCard = readObject(beta.listCard)
    assert.equal(betaCard.statusDot, 'yellow')
    assert.equal(betaCard.statusReason, 'pending_proposals')
    assert.equal(betaCard.actionableProposalCount, 1)
    assert.equal(betaCard.viewActionId, 'ai_player_view:list_beta')

    const gammaCard = readObject(gamma.listCard)
    assert.equal(gammaCard.statusDot, 'gray')
    assert.equal(gammaCard.statusReason, 'inactive')
    assert.equal(gammaCard.viewActionId, 'ai_player_view:list_gamma')

    const deltaCard = readObject(delta.listCard)
    assert.equal(deltaCard.statusDot, 'red')
    assert.equal(deltaCard.statusReason, 'runtime_failure')
    assert.equal(deltaCard.actionableProposalCount, 0)
    assert.equal(deltaCard.playerRuntimeLastError, 'transfer_limit_exceeded')
    assert.equal(deltaCard.viewActionId, 'ai_player_view:list_delta')

    console.log('[ai_player_list_read_model_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[ai_player_list_read_model_contract] failed:', error)
  process.exitCode = 1
})
