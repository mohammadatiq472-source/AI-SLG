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
import {
  refineAiPlayerContextDocumentResponseSchema,
  upsertAiPlayerContextDocumentRequestSchema,
} from '../../shared/schemas/aiPlayer'

const AI_PLAYER_ID = 'player_operator_identity_refine_confirm'
const FACTION_ID = 'player'
const GOVERNOR_PLAYER_ID = 'human_identity_refine_confirm'

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    AI_PLAYER_GOVERNANCE_STATE_PATH: buildSessionPersistPath('ai_player_identity_refine_confirm_governance_state'),
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('ai_player_identity_refine_confirm_session_state'),
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

    const refine = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/context-documents/refine`, 'POST', {
      sourceContent: [
        '张飞 2026/05/05 21:00: 俺今天守青州粮道，弟兄们不能饿着。',
        '张飞 2026/05/05 21:03: 先护粮，再看有没有机会干就完了。',
        '刘备 2026/05/05 21:05: 说话可以直，但先报风险。',
      ].join('\n'),
      sourceFileName: 'wechat-zhangfei-confirm-upsert.txt',
      titleHint: '张飞确认入库身份文件',
      updatedBy: GOVERNOR_PLAYER_ID,
    })
    assert.equal(refine.status, 200, `identity refine preview failed: ${JSON.stringify(refine.data)}`)
    refineAiPlayerContextDocumentResponseSchema.parse(refine.data)
    const refinePayload = readObject(refine.data)
    assert.equal(refinePayload.ok, true)
    assert.equal(refinePayload.persisted, false)
    const refined = readObject(refinePayload.refined)
    assert.equal(refined.kind, 'identity')
    assert.equal(refined.title, '张飞确认入库身份文件')
    assert.equal(refined.sourceFileName, 'wechat-zhangfei-confirm-upsert.txt')
    assert.match(String(refined.content), /俺/)
    assert.match(String(refined.content), /护粮/)

    const runtimeAfterPreview = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}`, 'GET')
    assert.equal(runtimeAfterPreview.status, 200, `runtime after preview failed: ${JSON.stringify(runtimeAfterPreview.data)}`)
    assert.equal(readArray(readObject(runtimeAfterPreview.data).contextDocuments).length, 0)

    const suggestedUpsertRequest = upsertAiPlayerContextDocumentRequestSchema.parse(refinePayload.suggestedUpsertRequest)
    assert.equal(suggestedUpsertRequest.kind, 'identity')
    assert.equal(suggestedUpsertRequest.title, refined.title)
    assert.equal(suggestedUpsertRequest.content, refined.content)
    assert.equal(suggestedUpsertRequest.sourceFileName, refined.sourceFileName)
    assert.equal(suggestedUpsertRequest.updatedBy, GOVERNOR_PLAYER_ID)

    const confirmed = await requestJson(
      baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/context-documents`,
      'POST',
      suggestedUpsertRequest,
    )
    assert.equal(confirmed.status, 200, `identity confirm upsert failed: ${JSON.stringify(confirmed.data)}`)
    const confirmedPayload = readObject(confirmed.data)
    assert.equal(confirmedPayload.ok, true)
    const document = readObject(confirmedPayload.document)
    assert.match(String(document.documentId), /^ctx_/)
    assert.equal(document.kind, 'identity')
    assert.equal(document.title, refined.title)
    assert.equal(document.content, refined.content)
    assert.equal(document.sourceFileName, refined.sourceFileName)
    assert.equal(document.updatedBy, GOVERNOR_PLAYER_ID)
    assert.equal(document.contentBytes, refined.contentBytes)

    const player = readObject(confirmedPayload.player)
    const contextDocuments = readArray(player.contextDocuments)
    assert.equal(contextDocuments.length, 1)
    assert.equal(readObject(contextDocuments[0]).documentId, document.documentId)
    assert.equal(readObject(contextDocuments[0]).title, '张飞确认入库身份文件')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
