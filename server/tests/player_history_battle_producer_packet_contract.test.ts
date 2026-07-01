import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const readUtf8 = (path: string) => readFileSync(path, 'utf-8')

const authority = readUtf8('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const historyContracts = readUtf8('shared/contracts/game/history.ts')
const rulesSource = readUtf8('shared/domain/rules.ts')
const worldService = readUtf8('server/src/application/world/WorldService.ts')
const playerHistoryDomain = readUtf8('shared/domain/playerHistory.ts')
const occupyTileProducerContract = readUtf8('server/tests/player_history_battle_occupy_tile_producer_contract.test.ts')
const packageJson = readUtf8('package.json')

const contractId = 'player_history_battle_producer_packet_contract'

for (const required of [
  contractId,
  'battle_history_producer_packet',
  'Battle History Producer Packet Contract',
  'BattleOutcomeRecord',
  'recordBattleOutcome(world, record)',
  'buildTimelineCardFromReplay',
  'battle_report_panel/list/detail',
  'battle_recorded',
  'battle_report_available',
  'replay_available',
  'replay_unavailable',
  'loss_or_damage',
  'territory_or_resource_effect',
  'dedupe',
  'scope_denied',
  'recovery',
  'playerHistoryCategory',
  '`npm.cmd run test:world:player-history-battle-occupy-tile-producer-contract` now proves the first real occupyTile battle overlay producer.',
]) {
  assert.ok(authority.includes(required), `missing battle producer authority proof: ${required}`)
}

assert.ok(
  packageJson.includes('"test:world:player-history-battle-producer-packet-contract"'),
  'package.json must expose the battle producer packet contract command',
)
assert.ok(
  packageJson.includes('"test:world:player-history-battle-occupy-tile-producer-contract"'),
  'package.json must expose the occupyTile battle producer contract command',
)

for (const contractToken of [
  'export type BattleOutcomeRecord = {',
  'outcome: \'win\' | \'loss\' | \'draw\'',
  'attackerLoss: number',
  'defenderLoss: number',
  'reportKind?: \'resource_guard\' | \'field_battle\' | \'city_siege\'',
  'sourceRefs?: {',
  'battleReportId?: string',
  'replayRequestId?: string',
]) {
  assert.ok(historyContracts.includes(contractToken), `history contract should expose battle producer field: ${contractToken}`)
}

assert.ok(rulesSource.includes('function recordBattleOutcome(world: WorldState, record: BattleOutcomeRecord)'), 'rules must record real battle outcomes')
assert.ok(rulesSource.includes('world.feedback.battleRecords = [enrichedRecord, ...world.feedback.battleRecords].slice(0, 500)'), 'battle outcomes should persist into feedback records')
assert.ok(rulesSource.includes('battleReportSurface: \'battle_report_panel/list/detail\''), 'battle receipts should reuse the battle report surface')

for (const sourceToken of [
  'function buildBattleOccupyTileHistoryOverlay',
  "playerHistoryCategory: 'battle'",
  "playerHistoryTitle: '战斗已结束'",
  "playerHistoryNextAction: '查看战报'",
  "playerHistoryScope: 'own_faction'",
  'battleReportId: record.id',
]) {
  assert.ok(worldService.includes(sourceToken), `WorldService battle producer source should prove ${sourceToken}`)
}

for (const producerToken of [
  'player_history_battle_occupy_tile_producer_contract',
  "action: 'occupyTile'",
  "metadata.playerHistoryCategory, 'battle'",
  "card.category === 'battle'",
  'real battle record',
]) {
  assert.ok(occupyTileProducerContract.includes(producerToken), `occupyTile battle producer contract should prove ${producerToken}`)
}

for (const replayToken of [
  'function buildTimelineCardFromReplay(replay: ExecutionReplay): PlayerWorldTimelineCard',
  'category: \'battle\'',
  'title: replay.strategicCommand || \'战斗回放已生成\'',
  'nextActionLabel: replay.frames.length > 0 ? \'查看回放\' : undefined',
  'replayRequestId: replay.requestId',
]) {
  assert.ok(playerHistoryDomain.includes(replayToken), `replay timeline builder should expose ${replayToken}`)
}

const battleProducerStates = [
  'battle_recorded',
  'battle_report_available',
  'replay_available',
  'replay_unavailable',
  'loss_or_damage',
  'territory_or_resource_effect',
  'dedupe',
  'scope_denied',
  'recovery',
]
assert.equal(battleProducerStates.length, 9)

const battleProducerFixture = {
  contractId,
  category: 'battle',
  playerHistoryTitle: '战斗已结束',
  playerHistoryActorName: '虎牢关守军',
  playerHistorySummary: '前线交战已结算，守军击退敌军。',
  playerHistoryLocation: '虎牢关',
  playerHistoryTarget: '敌军先锋',
  playerHistoryResultLabel: '胜利',
  playerHistoryConsequence: '前线压力下降，部队需要修整。',
  playerHistoryNextAction: '查看战报',
  playerHistorySeverity: 'medium',
  sourceRefs: {
    battleReportId: 'summary-only-battle-report-id',
    replayRequestId: 'summary-only-replay-id',
  },
  replayAvailable: true,
  reportOnlyWorldEffect: false,
  dedupeKey: 'battle:hulao:turn-44:win',
}

assert.equal(battleProducerFixture.category, 'battle')
assert.equal(battleProducerFixture.replayAvailable, true)
assert.equal(battleProducerFixture.reportOnlyWorldEffect, false)
assert.ok(battleProducerFixture.sourceRefs.battleReportId.length > 0)
assert.ok(battleProducerFixture.sourceRefs.replayRequestId.length > 0)
assert.ok(battleProducerFixture.dedupeKey.startsWith('battle:'))

const playerVisibleCopy = [
  battleProducerFixture.playerHistoryTitle,
  battleProducerFixture.playerHistoryActorName,
  battleProducerFixture.playerHistorySummary,
  battleProducerFixture.playerHistoryLocation,
  battleProducerFixture.playerHistoryTarget,
  battleProducerFixture.playerHistoryResultLabel,
  battleProducerFixture.playerHistoryConsequence,
  battleProducerFixture.playerHistoryNextAction,
  '这段回放未开放查看',
].join('\n')

for (const forbidden of [
  'recordBattleOutcome',
  'battleReportSurface',
  'battle_report_panel/list/detail',
  'raw report id',
  'unit id',
  'route',
  'debug',
  'AI-digest',
  'fixture',
  'gate',
  'requestId',
  'replayRequestId',
  'battleReportId',
  'sourceRefs',
  'snake_case',
]) {
  assert.equal(
    playerVisibleCopy.includes(forbidden),
    false,
    `battle producer visible copy leaked implementation term: ${forbidden}`,
  )
}

console.log('[player_history_battle_producer_packet_contract] all checks passed')
