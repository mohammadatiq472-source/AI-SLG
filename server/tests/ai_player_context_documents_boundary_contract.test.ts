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

const AI_PLAYER_ID = 'player_operator_context_boundary'
const FACTION_ID = 'player'
const GOVERNOR_PLAYER_ID = 'human_context_boundary'

async function upsertContextDocument(baseUrl: string, index: number, overrides: Record<string, unknown> = {}) {
  return requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/context-documents`, 'POST', {
    documentId: `ctx_boundary_${String(index).padStart(2, '0')}`,
    kind: index % 2 === 0 ? 'memory' : 'instruction',
    title: `边界上下文 ${index}`,
    content: `第 ${index} 条上下文用于验证身份文件数量边界。`,
    sourceFileName: `boundary-${index}.txt`,
    updatedBy: GOVERNOR_PLAYER_ID,
    ...overrides,
  })
}

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_context_documents_boundary_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_context_documents_boundary_session_state'),
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
      displayName: '上下文边界官',
      governorPlayerId: GOVERNOR_PLAYER_ID,
      factionId: FACTION_ID,
      actionWhitelist: ['resource_transfer_to_governor'],
    })
    assert.equal(register.status, 200, `register failed: ${JSON.stringify(register.data)}`)

    for (let index = 1; index <= 16; index += 1) {
      const upsert = await upsertContextDocument(baseUrl, index)
      assert.equal(upsert.status, 200, `context document ${index} upsert failed: ${JSON.stringify(upsert.data)}`)
      const payload = readObject(upsert.data)
      assert.equal(payload.ok, true)
      assert.equal(readArray(readObject(payload.player).contextDocuments).length, index)
    }

    const seventeenth = await upsertContextDocument(baseUrl, 17)
    assert.equal(seventeenth.status, 400, `17th context document should be rejected: ${JSON.stringify(seventeenth.data)}`)
    assert.equal(readObject(seventeenth.data).ok, false)
    assert.equal(readObject(seventeenth.data).error, 'context document limit reached')

    const updateExisting = await upsertContextDocument(baseUrl, 3, {
      kind: 'identity',
      title: '已更新身份上下文',
      content: '满额后允许按 documentId 更新既有上下文；不能新增第十七条。',
      sourceFileName: 'updated-boundary-3.txt',
    })
    assert.equal(updateExisting.status, 200, `existing context update should succeed while full: ${JSON.stringify(updateExisting.data)}`)
    const updatePayload = readObject(updateExisting.data)
    assert.equal(updatePayload.ok, true)
    const updatedDocument = readObject(updatePayload.document)
    assert.equal(updatedDocument.documentId, 'ctx_boundary_03')
    assert.equal(updatedDocument.kind, 'identity')
    assert.equal(updatedDocument.title, '已更新身份上下文')
    assert.equal(updatedDocument.sourceFileName, 'updated-boundary-3.txt')
    const contextDocumentsAfterUpdate = readArray(readObject(updatePayload.player).contextDocuments)
    assert.equal(contextDocumentsAfterUpdate.length, 16, 'updating an existing document must not increase document count')
    const storedUpdated = readObject(contextDocumentsAfterUpdate.find((item) => readObject(item).documentId === 'ctx_boundary_03'))
    assert.equal(storedUpdated.title, '已更新身份上下文')
    assert.match(String(storedUpdated.content), /允许按 documentId 更新/)

    const tooLongContent = await upsertContextDocument(baseUrl, 18, {
      documentId: 'ctx_boundary_too_long',
      content: 'x'.repeat(12001),
    })
    assert.equal(tooLongContent.status, 422, `oversized context content should be rejected by schema: ${JSON.stringify(tooLongContent.data)}`)
    assert.equal(readObject(tooLongContent.data).ok, false)

    const runtimeAfterRejectedWrites = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}`, 'GET')
    assert.equal(runtimeAfterRejectedWrites.status, 200, `runtime after rejected writes failed: ${JSON.stringify(runtimeAfterRejectedWrites.data)}`)
    assert.equal(readArray(readObject(runtimeAfterRejectedWrites.data).contextDocuments).length, 16)
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
