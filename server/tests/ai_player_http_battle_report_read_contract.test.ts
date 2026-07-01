import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  AI_PLAYER_ID,
  FACTION_ID,
  GOVERNOR_PLAYER_ID,
  joinGovernor,
  loadWorldState,
  startAiPlayerHttpBackend,
  type AiPlayerHttpBackend,
} from './helpers/aiPlayerHttpContractHarness'
import { readArray, readObject, requestJson } from './helpers/backendHarness'

function seedWorldStateWithBattleReports(): { persistRoot: string; path: string; unitId: string; tileId: string } {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding AI player battle-report shard`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding AI player battle-report shard`)

  unit.aiPlayerId = AI_PLAYER_ID
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: 'Player Operator Alpha',
      factionId: FACTION_ID,
      unitIds: [unit.id],
      specialty: 'logistics',
    },
  ]
  world.tick = 21
  world.feedback.battleRecords = [
    {
      id: 'battle_read_win_previous',
      tick: 19,
      regionId: 'west_front',
      tileId: unit.tileId,
      attackerFaction: FACTION_ID,
      attackerUnitId: unit.id,
      outcome: 'win',
      attackerLoss: 8,
      defenderLoss: 34,
      alliedSupport: 1,
      summary: 'AI unit won a low-loss skirmish.',
    },
    {
      id: 'battle_read_enemy_irrelevant',
      tick: 20,
      regionId: 'north_recon',
      tileId: 'tile_enemy_irrelevant',
      attackerFaction: 'enemy',
      attackerUnitId: 'enemy_unit_for_contract',
      outcome: 'win',
      attackerLoss: 4,
      defenderLoss: 12,
      alliedSupport: 0,
      summary: 'Enemy-only report should not enter the AI player read model.',
    },
    {
      id: 'battle_read_loss_latest',
      tick: 20,
      regionId: 'west_front',
      tileId: unit.tileId,
      attackerFaction: FACTION_ID,
      attackerUnitId: unit.id,
      outcome: 'loss',
      attackerLoss: 80,
      defenderLoss: 20,
      alliedSupport: 0,
      summary: 'AI unit lost with high troop damage.',
      replayRequestId: 'replay_battle_read_loss_latest',
    },
  ]

  const persistRoot = join(process.cwd(), 'tmp', `ai_player_http_battle_report_read_world_${process.pid}_${Date.now()}`)
  const path = join(persistRoot, 'world_snapshot.json')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { persistRoot, path, unitId: unit.id, tileId: unit.tileId }
}

async function bootBattleReportReadBackend(worldPersistRoot: string): Promise<AiPlayerHttpBackend> {
  const backend = await startAiPlayerHttpBackend(
    'ai_player_http_battle_report_read_contract',
    undefined,
    {
      WORLD_PERSIST_ROOT: worldPersistRoot,
    },
  )
  await joinGovernor(backend.baseUrl)
  const register = await requestJson(backend.baseUrl, '/api/ai/players', 'POST', {
    aiPlayerId: AI_PLAYER_ID,
    displayName: 'Player Operator Alpha',
    governorPlayerId: GOVERNOR_PLAYER_ID,
    factionId: FACTION_ID,
    actionWhitelist: ['battle_report_read', 'troop_heal'],
  })
  assert.equal(register.status, 200, `register battle-report AI player failed: ${JSON.stringify(register.data)}`)
  return backend
}

async function run() {
  const seeded = seedWorldStateWithBattleReports()
  const backend = await bootBattleReportReadBackend(seeded.persistRoot)
  try {
    const catalog = await requestJson(backend.baseUrl, '/api/ai/player-actions/catalog', 'GET')
    assert.equal(catalog.status, 200)
    const readEntry = readArray(readObject(catalog.data).catalog)
      .map((item) => readObject(item))
      .find((item) => item.action === 'battle_report_read')
    assert.ok(readEntry, 'catalog should expose battle_report_read')
    assert.equal(readEntry.riskLevel, 'low')
    assert.equal(readEntry.requiresApprovalByDefault, false)
    assert.equal(readEntry.executableInV1, false, 'battle_report_read must remain read-model only')

    const missing = await requestJson(backend.baseUrl, '/api/ai/players/missing_ai/battle-reports', 'GET')
    assert.equal(missing.status, 404, 'battle report read-model should 404 for unknown AI player')

    const worldBefore = await loadWorldState(backend.baseUrl)
    const readModelResult = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/battle-reports?limit=2`,
      'GET',
    )
    assert.equal(readModelResult.status, 200, `battle report read model failed: ${JSON.stringify(readModelResult.data)}`)
    const readModel = readObject(readModelResult.data)
    assert.equal(readModel.aiPlayerId, AI_PLAYER_ID)
    assert.equal(readModel.factionId, FACTION_ID)
    assert.equal(readModel.limit, 2)
    assert.equal(readModel.count, 2)
    assert.deepEqual(readArray(readModel.unitIds), [seeded.unitId])

    const items = readArray(readModel.items).map((item) => readObject(item))
    assert.equal(items.length, 2)
    assert.equal(items[0].reportId, 'battle_read_loss_latest')
    assert.equal(items[0].outcome, 'loss')
    assert.equal(items[0].perspective, 'attacker')
    assert.equal(items[0].severity, 'high')
    assert.equal(items[0].assignedUnitInvolved, true)
    assert.equal(items[0].ownLoss, 80)
    assert.equal(items[0].enemyLoss, 20)
    assert.match(String(items[0].nextStepSuggestion), /补兵|驻防/)
    assert.equal(items[0].replayRequestId, 'replay_battle_read_loss_latest')
    assert.equal(items[1].reportId, 'battle_read_win_previous')
    assert.equal(items.some((item) => item.reportId === 'battle_read_enemy_irrelevant'), false)

    const subjectResult = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}&battleResultLimit=2`,
      'GET',
      undefined,
      60_000,
    )
    assert.equal(subjectResult.status, 200, `subject battle readback failed: ${JSON.stringify(subjectResult.data)}`)
    const subject = readObject(readObject(subjectResult.data).subject)
    const recentBattleResults = readObject(subject.recentBattleResults)
    assert.equal(recentBattleResults.count, 2)
    const subjectBattleItems = readArray(recentBattleResults.items).map((item) => readObject(item))
    assert.equal(subjectBattleItems[0].reportId, 'battle_read_loss_latest')
    assert.equal(subjectBattleItems[0].nextStepSuggestion, items[0].nextStepSuggestion)

    const recentBodyChanges = readObject(subject.recentBodyChanges)
    assert.equal(recentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
    const bodyChangeItems = readArray(recentBodyChanges.items).map((item) => readObject(item))
    const latestBattleBodyChange = bodyChangeItems.find((item) => item.battleReportId === 'battle_read_loss_latest')
    assert.ok(latestBattleBodyChange, 'latest AI-owned battle report must become a subject war body change')
    assert.equal(latestBattleBodyChange.bodyNode, 'war_and_relations')
    assert.equal(latestBattleBodyChange.action, 'battle_report_read')
    assert.equal(latestBattleBodyChange.status, 'failed')
    assert.equal(latestBattleBodyChange.unitId, seeded.unitId)
    assert.equal(latestBattleBodyChange.targetTileId, seeded.tileId)
    assert.equal(latestBattleBodyChange.battleOutcome, 'loss')
    assert.equal(latestBattleBodyChange.battleSeverity, 'high')
    assert.equal(latestBattleBodyChange.battlePerspective, 'attacker')
    assert.equal(latestBattleBodyChange.battleAssignedUnitInvolved, true)
    assert.equal(latestBattleBodyChange.battleOwnLoss, 80)
    assert.equal(latestBattleBodyChange.battleEnemyLoss, 20)
    assert.equal(latestBattleBodyChange.replayRequestId, 'replay_battle_read_loss_latest')
    assert.equal(latestBattleBodyChange.reportKind, 'battle_report')
    assert.equal(latestBattleBodyChange.recoveryAnchorAvailable, true)
    assert.equal(latestBattleBodyChange.recoveryAnchorKind, 'replay')
    assert.equal(latestBattleBodyChange.recoveryAnchorReplayRequestId, 'replay_battle_read_loss_latest')
    assert.equal(latestBattleBodyChange.recoveryAnchorReplayStatus, 'unavailable')
    assert.equal(latestBattleBodyChange.recoveryAnchorBattleReportId, 'battle_read_loss_latest')
    assert.equal(latestBattleBodyChange.recoveryAnchorReportKind, 'battle_report')
    assert.equal(latestBattleBodyChange.recoveryAnchorSourceVisibility, 'internal_link_only')
    assert.equal(latestBattleBodyChange.nextSubjectFocus, 'war')
    assert.equal(latestBattleBodyChange.visibleToAi, true)
    assert.match(String(latestBattleBodyChange.battleNextStepSuggestion), /补兵|驻防/)
    assert.equal(latestBattleBodyChange.warFollowUpAction, 'troop_heal')
    assert.equal(latestBattleBodyChange.warFollowUpReadiness, 'ready')
    assert.match(String(latestBattleBodyChange.warFollowUpReason), /损失|补兵|驻防/)
    const latestBattleFollowUpArgs = readObject(latestBattleBodyChange.warFollowUpArgs)
    assert.equal(latestBattleFollowUpArgs.unitId, seeded.unitId)
    const followUpProposal = await requestJson(backend.baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      action: latestBattleBodyChange.warFollowUpAction,
      source: 'rule',
      reason: latestBattleBodyChange.warFollowUpReason,
      args: latestBattleFollowUpArgs,
    })
    assert.equal(followUpProposal.status, 200, `subject war follow-up proposal creation failed: ${JSON.stringify(followUpProposal.data)}`)
    const followUpProposalPayload = readObject(readObject(followUpProposal.data).proposal)
    assert.equal(followUpProposalPayload.action, 'troop_heal')
    assert.equal(followUpProposalPayload.status, 'pending_approval')
    assert.equal(readObject(followUpProposalPayload.args).unitId, seeded.unitId)
    assert.match(String(followUpProposalPayload.reason), /整补|补兵|驻防/)

    const recentRecoveryAnchors = readObject(subject.recentRecoveryAnchors)
    assert.equal(recentRecoveryAnchors.contractId, 'ai_player_subject_recovery_anchors_v1')
    const recoveryItems = readArray(recentRecoveryAnchors.items).map((item) => readObject(item))
    const battleReplayAnchor = recoveryItems.find((item) => {
      const refs = readObject(item.sourceRefs)
      return item.kind === 'replay' && refs.replayRequestId === 'replay_battle_read_loss_latest'
    })
    assert.ok(battleReplayAnchor, 'latest AI-owned battle report must expose a replay recovery anchor')
    assert.equal(battleReplayAnchor.title, '战斗回放')
    assert.match(String(battleReplayAnchor.summary), /AI unit lost/)
    const battleReplayAnchorRefs = readObject(battleReplayAnchor.sourceRefs)
    assert.equal(battleReplayAnchorRefs.battleReportId, 'battle_read_loss_latest')
    assert.equal(battleReplayAnchorRefs.reportKind, 'battle_report')
    assert.equal(battleReplayAnchorRefs.replayRecoveryStatus, 'unavailable')
    assert.equal(battleReplayAnchorRefs.replayRecoveryReason, 'missing_replay_record')

    const worldAfter = await loadWorldState(backend.baseUrl)
    assert.deepEqual(
      worldAfter.feedback.battleRecords,
      worldBefore.feedback.battleRecords,
      'battle_report_read read model must not mutate battle records',
    )
    assert.equal(worldAfter.worldVersion, worldBefore.worldVersion, 'battle_report_read read model must not mutate worldVersion')

    console.log('[ai_player_http_battle_report_read_contract] all checks passed')
  } finally {
    await backend.stop()
  }
}

run().catch((error) => {
  console.error('[ai_player_http_battle_report_read_contract] failed:', error)
  process.exitCode = 1
})
