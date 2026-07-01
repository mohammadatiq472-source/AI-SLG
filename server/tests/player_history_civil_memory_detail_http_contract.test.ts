import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import {
  buildSessionPersistPath,
  getAvailablePort,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

const tail: TailState = { stdout: [], stderr: [] }
const port = await getAvailablePort()
const baseUrl = `http://127.0.0.1:${port}`
const civilMemoryPath = buildSessionPersistPath('player_history_civil_memory_detail_http_ledger')

mkdirSync(dirname(civilMemoryPath), { recursive: true })
writeFileSync(
  civilMemoryPath,
  JSON.stringify([
    {
      id: 'civil-detail-http-1',
      tick: 12,
      type: 'court_resolution',
      title: '河东军议已有结论',
      summary: '朝议要求先稳住河东粮道，再推进前线。',
      relatedIds: ['resolution-1', 'grain-road-1'],
      factionIds: ['player'],
      sessionId: 'court-session-1',
      proposalId: 'proposal-1',
      resolutionId: 'resolution-1',
      outcome: 'success',
      responsibilities: [{ seatId: 'seat-player', role: 'executor', weight: 1 }],
      metadata: {
        internalPlannerTrace: 'do_not_expose',
      },
      createdAt: '2026-06-12T00:00:00.000Z',
    },
  ]),
  'utf8',
)

const child = spawnBackend(port, tail, {
  CIVIL_MEMORY_PATH: civilMemoryPath,
  WORLD_SAVE_SLOTS_PATH: buildSessionPersistPath('player_history_civil_memory_detail_http_save_slots'),
  WORLD_SAVE_SLOTS_ARCHIVE_DIR: `${buildSessionPersistPath('player_history_civil_memory_detail_http_save_slots_archive')}.archive`,
})

try {
  const health = await waitForHealth(baseUrl)
  assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

  const missing = await requestJson(baseUrl, '/api/player-history/civil-memory-detail', 'GET')
  assert.equal(missing.status, 400, `missing id should be rejected: ${JSON.stringify(missing.data)}`)
  assert.equal(readObject(missing.data).deniedCopy, '暂无可查看的传闻详情')

  const unknown = await requestJson(baseUrl, '/api/player-history/civil-memory-detail?civilMemoryId=missing', 'GET')
  assert.equal(unknown.status, 404, `unknown id should return 404: ${JSON.stringify(unknown.data)}`)
  assert.equal(readObject(unknown.data).deniedCopy, '这段传闻暂时不可查看')

  const response = await requestJson(
    baseUrl,
    '/api/player-history/civil-memory-detail?civilMemoryId=civil-detail-http-1',
    'GET',
  )
  assert.equal(response.status, 200, `detail route should return 200: ${JSON.stringify(response.data)}`)

  const payload = readObject(response.data)
  const detail = readObject(payload.civilMemoryDetail)
  assert.equal(detail.contractId, 'civil_memory_detail_read_model_v1')
  assert.equal(detail.title, '河东军议已有结论')
  assert.equal(detail.summary, '朝议要求先稳住河东粮道，再推进前线。')
  assert.equal(detail.affectedPartyLabel, '相关势力 player')
  assert.equal(detail.resultLabel, '已生效')
  assert.equal(detail.consequenceLabel, '关联 2 项线索')
  assert.equal(detail.followUpLabel, undefined)
  assert.equal(detail.timestampLabel, '第 12 回合')
  assert.equal(detail.relatedCountLabel, '关联 2 项')
  assert.equal(detail.responsibilityCountLabel, '责任 1 项')
  assert.equal(detail.archiveStateLabel, '记录已归档')

  const visibleDetailPayload = JSON.stringify(detail)
  for (const forbidden of [
    'civil-detail-http-1',
    'sourceRefs',
    'metadata',
    'integrity',
    'internalPlannerTrace',
    'sessionId',
    'proposalId',
    'resolutionId',
  ]) {
    assert.ok(!visibleDetailPayload.includes(forbidden), `civil memory detail read model should not leak ${forbidden}`)
  }
} finally {
  await shutdownChild(child)
}

console.log('[player_history_civil_memory_detail_http_contract] all checks passed')
