import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import type { BattleOutcomeRecord, WorldState } from '../../shared/contracts/game'
import { createInitialWorldState } from '../../shared/domain/scenario'
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

const FACTION_ID = 'player'
const AI_PLAYER_ID = 'seeded_closure_ai_player'
const ORGANIZATION_ID = 'player'
const ORGANIZATION_NAME = '青州同盟'

function readWorldStatePayload(value: unknown): WorldState {
  const root = readObject(value)
  const world = readObject(root.world)
  return world as unknown as WorldState
}

function seedInitialWorldState(): string {
  const world = createInitialWorldState()
  world.feedback.battleRecords = []
  const path = buildSessionPersistPath('battle_report_seeded_closure_http_contract_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return path
}

function isPlayerOwned(record: BattleOutcomeRecord): boolean {
  return record.ownerFactionId === FACTION_ID &&
    !record.aiPlayerId &&
    !record.attackerAiPlayerId &&
    !record.organizationId
}

function isAiOwned(record: BattleOutcomeRecord): boolean {
  return record.aiPlayerId === AI_PLAYER_ID || record.attackerAiPlayerId === AI_PLAYER_ID
}

function isOrganizationOwned(record: BattleOutcomeRecord): boolean {
  return record.organizationId === ORGANIZATION_ID && record.organizationName === ORGANIZATION_NAME
}

function readNumber(value: unknown, label: string): number {
  assert.equal(typeof value, 'number', `${label} should be a number`)
  return value as number
}

function expectSeededUnitTroops(record: BattleOutcomeRecord) {
  assert.ok(record.attackerUnit, `seeded battle record ${record.id} should carry attackerUnit`)
  const unit = record.attackerUnit as unknown as Record<string, unknown>
  assert.equal(readNumber(unit.currentTroops, `${record.id}.attackerUnit.currentTroops`), record.attackerTroops)
  assert.equal(readNumber(unit.maxTroops, `${record.id}.attackerUnit.maxTroops`), record.attackerMaxTroops)
  assert.equal(readNumber(unit.lossTroops, `${record.id}.attackerUnit.lossTroops`), record.attackerLoss)
  const slots = [unit.hero, ...((unit.coHeroes as unknown[] | undefined) ?? [])]
  assert.ok(slots.length >= 1, `seeded battle record ${record.id} should expose hero troop slots`)
  assert.equal(
    slots.reduce<number>((sum, slot) => sum + readNumber((slot as Record<string, unknown>).currentTroops, `${record.id}.slot.currentTroops`), 0),
    record.attackerTroops,
  )
  assert.equal(
    slots.reduce<number>((sum, slot) => sum + readNumber((slot as Record<string, unknown>).maxTroops, `${record.id}.slot.maxTroops`), 0),
    record.attackerMaxTroops,
  )
  assert.equal(
    slots.reduce<number>((sum, slot) => sum + readNumber((slot as Record<string, unknown>).lossTroops, `${record.id}.slot.lossTroops`), 0),
    record.attackerLoss,
  )
}

function readSeededBattleReportActionIds(payload: Record<string, unknown>): string[] {
  const actions = payload.seededBattleReportActions
  assert.ok(Array.isArray(actions), 'repeat seed should expose seededBattleReportActions')
  return actions.map((value, index): string => {
    const action = readObject(value)
    const id = action.battleRecordId
    assert.equal(typeof id, 'string', `seededBattleReportActions[${index}].battleRecordId should be a string`)
    return String(id)
  })
}

async function run() {
  const persistPath = seedInitialWorldState()
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: persistPath,
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const result = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'seedBattleReportClosure',
      payload: {
        factionId: FACTION_ID,
        aiPlayerId: AI_PLAYER_ID,
        organizationId: ORGANIZATION_ID,
        organizationName: ORGANIZATION_NAME,
        organizationKind: 'alliance',
      },
    }, 60_000)

    assert.equal(result.status, 200, `seed battle report closure route failed: ${JSON.stringify(result.data)}`)
    const payload = readObject(result.data)
    assert.equal(payload.ok, true, `seed battle report closure should succeed: ${JSON.stringify(payload)}`)
    assert.equal(payload.seededBattleReportCount, 4, 'seed closure should create exactly four fresh battle records')
    assert.equal(payload.seededBattleReportPlayerOwnedCount, 1, 'seed closure should expose one human/player-owned battle record')
    assert.equal(payload.seededBattleReportAiOwnedCount, 2, 'seed closure should expose two AI-owned battle records')
    assert.equal(payload.seededBattleReportOrganizationOwnedCount, 1, 'seed closure should expose one organization-owned battle record')

    const worldAfter = readWorldStatePayload(result.data)
    const records = worldAfter.feedback.battleRecords
    assert.ok(records.length >= 4, 'world payload should include seeded battle records')
    assert.ok(records.some(isPlayerOwned), 'battleRecords should include a human/player-owned record')
    assert.ok(records.some(isAiOwned), 'battleRecords should include an AI-player-owned record')
    assert.ok(records.some(isOrganizationOwned), 'battleRecords should include an organization-owned record')
    const playerOwnedRecord = records.find(isPlayerOwned)
    assert.ok(playerOwnedRecord, 'seed closure should expose a player-owned battle report')
    const playerOwnedReplayRequestId = String(playerOwnedRecord.replayRequestId ?? '').trim()
    assert.ok(playerOwnedReplayRequestId.length > 0, 'player-owned seeded battle report should expose a replay request id')
    assert.equal(payload.seededBattleReportReplayRequestId, playerOwnedReplayRequestId)
    const seededReplay = worldAfter.history.executionReplays.find((replay) => replay.requestId === playerOwnedReplayRequestId)
    assert.ok(seededReplay, 'world history should include a replay for the player-owned seeded battle report')
    assert.ok(seededReplay.frames.length > 0, 'seeded battle report replay should include visible frames')
    assert.equal(seededReplay.outcome, 'completed')
    const playerHistoryReplay = await requestJson(
      baseUrl,
      `/api/player-history?limit=20&replayLimit=5&replayRequestId=${encodeURIComponent(playerOwnedReplayRequestId)}`,
      'GET',
    )
    assert.equal(
      playerHistoryReplay.status,
      200,
      `player-history replay route failed: ${JSON.stringify(playerHistoryReplay.data)}`,
    )
    const replayReadModel = readObject(readObject(playerHistoryReplay.data).replay)
    assert.notEqual(
      replayReadModel.battleReportId,
      playerOwnedReplayRequestId,
      'player-visible replay battleReportId should not expose raw replay request id',
    )
    assert.ok(
      Array.isArray(replayReadModel.frames) && replayReadModel.frames.length > 0,
      'player-history route should expose seeded battle report replay frames',
    )
    for (const record of records.slice(0, 4)) {
      assert.equal(record.reportKind, 'resource_guard')
      assert.ok(record.rounds?.length, `seeded battle record ${record.id} should include round details`)
      assert.ok(record.attackerUnit?.hero?.portraitKey, `seeded battle record ${record.id} should carry portrait read model`)
      expectSeededUnitTroops(record)
    }

    const repeatedResult = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'seedBattleReportClosure',
      payload: {
        factionId: FACTION_ID,
        aiPlayerId: AI_PLAYER_ID,
        organizationId: ORGANIZATION_ID,
        organizationName: ORGANIZATION_NAME,
        organizationKind: 'alliance',
        repeatCount: 8,
        allowReusableSeedTargets: true,
      },
    }, 60_000)
    assert.equal(repeatedResult.status, 200, `repeat seed battle report closure route failed: ${JSON.stringify(repeatedResult.data)}`)
    const repeatedPayload = readObject(repeatedResult.data)
    assert.equal(repeatedPayload.ok, true, `repeat seed battle report closure should succeed: ${JSON.stringify(repeatedPayload)}`)
    assert.equal(repeatedPayload.seededBattleReportCount, 32, 'repeat reusable seed should create 32 fresh battle records')
    assert.equal(repeatedPayload.seededBattleReportAiOwnedCount, 16, 'repeat reusable seed should expose 16 AI-owned battle records')
    assert.equal(repeatedPayload.seededBattleReportOrganizationOwnedCount, 8, 'repeat reusable seed should expose 8 organization-owned battle records')
    assert.equal(repeatedPayload.seededBattleReportPlayerOwnedCount, 8, 'repeat reusable seed should expose 8 player-owned battle records')
    assert.equal(repeatedPayload.seededBattleReportRepeatCount, 8)
    assert.equal(repeatedPayload.seededBattleReportReusableTargets, true)
    const repeatedBattleRecordIds = readSeededBattleReportActionIds(repeatedPayload)
    assert.equal(repeatedBattleRecordIds.length, 32, 'repeat reusable seed should expose one action per created battle record')
    assert.equal(new Set(repeatedBattleRecordIds).size, 32, 'repeat reusable seed should create stable unique battle record ids')

    console.log('[battle_report_seeded_closure_http_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[battle_report_seeded_closure_http_contract] failed:', error)
  process.exitCode = 1
})
