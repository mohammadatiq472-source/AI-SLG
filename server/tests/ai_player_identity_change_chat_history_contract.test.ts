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

const AI_PLAYER_ID = 'player_operator_identity_change_history'
const FACTION_ID = 'player'
const GOVERNOR_PLAYER_ID = 'human_identity_change_history'
const IDENTITY_DOCUMENT_ID = 'ctx_identity_change_history'

async function upsertIdentity(baseUrl: string, content: string) {
  return requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/context-documents`, 'POST', {
    documentId: IDENTITY_DOCUMENT_ID,
    kind: 'identity',
    title: '青州护粮官身份',
    content,
    sourceFileName: 'identity-change-history.txt',
    updatedBy: GOVERNOR_PLAYER_ID,
  })
}

async function listChatMessages(baseUrl: string) {
  const chat = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages?limit=50`, 'GET')
  assert.equal(chat.status, 200, `chat history read failed: ${JSON.stringify(chat.data)}`)
  return readArray(readObject(chat.data).messages).map((item) => readObject(item))
}

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_identity_change_history_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_identity_change_history_session_state'),
    AI_PLAYER_RUNTIME_MODEL: '',
    AI_PLAYER_RUNTIME_MODEL_BASE_URL: '',
    AI_PLAYER_RUNTIME_MODEL_API_KEY: '',
    LLM_RELAY_MODEL: '',
    LLM_RELAY_URL: '',
    LLM_RELAY_API_KEY: '',
    LLM_RELAY_API_KEYS: '',
    OPENAI_API_KEY: '',
  })

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
      displayName: '青州护粮官',
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      actionWhitelist: ['resource_transfer_to_governor'],
    })
    assert.equal(register.status, 200, `register failed: ${JSON.stringify(register.data)}`)

    const firstIdentity = await upsertIdentity(baseUrl, '旧身份：说话稳重，优先巡查。')
    assert.equal(firstIdentity.status, 200, `initial identity upsert failed: ${JSON.stringify(firstIdentity.data)}`)

    for (let index = 1; index <= 5; index += 1) {
      const sent = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/chat/messages`, 'POST', {
        body: `记录旧身份聊天 ${index}`,
        senderId: GOVERNOR_PLAYER_ID,
        senderName: '总督',
        createProposal: false,
      })
      assert.equal(sent.status, 200, `chat message ${index} failed: ${JSON.stringify(sent.data)}`)
    }

    const messagesBeforeIdentityChange = await listChatMessages(baseUrl)
    assert.equal(messagesBeforeIdentityChange.length, 10, 'five no-proposal commands should create governor and AI ack messages')
    const expectedKeptMessageIds = messagesBeforeIdentityChange.slice(-3).map((message) => message.messageId)

    const changedIdentity = await upsertIdentity(baseUrl, '新身份：自称俺，先护粮，再报风险，最后说干就完了。')
    assert.equal(changedIdentity.status, 200, `changed identity upsert failed: ${JSON.stringify(changedIdentity.data)}`)
    assert.equal(readObject(changedIdentity.data).ok, true)

    const messagesAfterIdentityChange = await listChatMessages(baseUrl)
    assert.equal(messagesAfterIdentityChange.length, 3, 'identity changes should keep only the latest three chat messages')
    assert.deepEqual(
      messagesAfterIdentityChange.map((message) => message.messageId),
      expectedKeptMessageIds,
      'identity changes should preserve the latest three existing messages in order',
    )
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
