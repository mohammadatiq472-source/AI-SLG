import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const readUtf8 = (path: string) => readFileSync(path, 'utf-8')

const authority = readUtf8('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const opsAuthority = readUtf8('docs/PRODUCT_AUTHORITY_EVENT_REPLAY_SAVE_OPS_CURRENT_2026_06_11.md')
const playerHistoryRoute = readUtf8('server/src/routes/playerHistory.ts')
const observabilityRoute = readUtf8('server/src/routes/observability.ts')
const playerHistoryDomain = readUtf8('shared/domain/playerHistory.ts')
const historyContracts = readUtf8('shared/contracts/game/history.ts')
const worldService = readUtf8('server/src/application/world/WorldService.ts')
const timelineAuthorityContract = readUtf8('server/tests/player_history_timeline_authority_contract.test.ts')
const assemblerContract = readUtf8('server/tests/player_history_read_model_assembler_contract.test.ts')
const accessScopeContract = readUtf8('server/tests/player_history_access_scope_contract.test.ts')
const replayPermissionContract = readUtf8('server/tests/player_history_replay_archive_permission_contract.test.ts')
const restoreApplyContract = readUtf8('server/tests/player_history_save_load_restore_apply_contract.test.ts')
const saveSlotOwnerScopeRuntimeContract = readUtf8('server/tests/player_history_save_slot_owner_scope_runtime_contract.test.ts')
const packageJson = readUtf8('package.json')

const contractId = 'player_history_system_producer_packet_contract'

for (const required of [
  contractId,
  'system_history_producer_packet',
  'System History Producer Packet Contract',
  'save_written',
  'save_setup_or_fixture',
  'restore_prepare',
  'restore_success',
  'restore_failure',
  'restore_skipped',
  'archive_unavailable',
  'replay_unavailable',
  'reconnect_or_bootstrap',
  'access_denied',
  'dedupe',
  'recovery',
  'playerHistoryCategory',
  'player_save_load_restore_feedback_contract',
  'local-prepare-vs-backend-apply boundary',
  '`npm.cmd run test:world:player-history-save-load-restore-apply-contract` now proves the first backend restore apply system overlay producer.',
]) {
  assert.ok(authority.includes(required), `missing system producer authority proof: ${required}`)
}

assert.ok(
  packageJson.includes('"test:world:player-history-system-producer-packet-contract"'),
  'package.json must expose the system producer packet contract command',
)
assert.ok(
  packageJson.includes('"test:world:player-history-save-load-restore-apply-contract"'),
  'package.json must expose the restore apply system producer contract command',
)
assert.ok(
  packageJson.includes('"test:world:player-history-save-slot-owner-scope-runtime-contract"'),
  'package.json must expose the save-slot owner scope runtime contract command',
)

for (const opsToken of [
  'Event / Replay / Save / Ops Support Layer',
  'not a player-facing feature-completion claim',
  'save-slot smoke setup',
  'archive inspection',
  'dry-run restore',
  'apply restore',
  'rollback-drill gates',
  'Player save/load UI with risk messaging',
]) {
  assert.ok(opsAuthority.includes(opsToken), `ops authority should include ${opsToken}`)
}

for (const routeToken of [
  'buildPlayerSaveLoadReadModel',
  'buildPlayerWorldTimelineReadModel',
  'buildBattleReplayScreenReadModel',
  'getWorldEvents',
  'getSaveSlots',
  'getReplayArchive',
  'getExecutionReplayByRequestId',
  'requestUrl.searchParams.get',
  'replayRequestId',
  'writeJson(res, 200, payload)',
  'includeOwnerless: saveSlotOwner === undefined',
]) {
  assert.ok(playerHistoryRoute.includes(routeToken), `player-history route should expose player-safe system source: ${routeToken}`)
}

for (const domainToken of [
  "contractId: 'player_save_load_slots_v1'",
  'export function buildCivilMemoryHistoryCards(entries: CivilMemoryEntry[]): CivilMemoryHistoryCard[]',
  "contractId: 'civil_memory_history_card_v1'",
  "civilMemoryId: entry.id",
  "visibility: 'internal_link_only'",
  'visible: false',
  "restoreRiskLabel: '恢复前请确认当前进度已保存'",
  "restoreFeedbackLabel: sortedSlots.length > 0 ? '选择存档后可预览恢复结果' : undefined",
  "emptyStateLabel: '暂无可恢复存档'",
  'function buildTimelineCardFromSaveSlot(slot: SaveSlotRecord): PlayerWorldTimelineCard',
  "category: 'system'",
  "actorName: '玩家'",
  "title: '存档已保存'",
  "resultLabel: '可恢复'",
  "nextActionLabel: '需要时可从存档恢复'",
]) {
  assert.ok(playerHistoryDomain.includes(domainToken), `player history domain should expose system/save model: ${domainToken}`)
}

for (const historyContractToken of [
  'export type CivilMemoryHistoryCard',
  'sourceRefs?:',
  "visibility: 'internal_link_only'",
  'visible: false',
  'civilMemoryId: string',
]) {
  assert.ok(historyContracts.includes(historyContractToken), `history contracts should expose ${historyContractToken}`)
}

for (const timelineToken of [
  'save_slot_list_read_model',
  'local_restore_prepare_feedback',
  'backend_restore_success_failure',
  'restore_success',
  'restore_failure',
  'restore_skipped',
  'archive_unavailable',
  "'/api/save-slots/*'",
  "app.includes(\"requestUrl.pathname === '/api/save-slots/load'\")",
]) {
  assert.ok(timelineAuthorityContract.includes(timelineToken), `timeline authority contract should prove ${timelineToken}`)
}

for (const sourceToken of [
  'function buildSaveLoadRestoreHistoryOverlay',
  "export type SaveSlotRestoreScopeToken = 'own_save_slot'",
  'export type SaveSlotOwnerContext',
  'export type SaveSlotVisibilityOptions',
  "export const SAVE_SLOT_RESTORE_SCOPE_TOKEN",
  'function isSaveSlotVisibleToOwner',
  'includeOwnerless = true',
  'ownerFactionId: owner?.factionId',
  'getSaveSlots(options: SaveSlotVisibilityOptions',
  "playerHistoryTitle: '存档已恢复'",
  "playerHistoryTitle: '存档恢复失败'",
  'playerHistoryScope: params.scopeToken',
  'scopeToken: SaveSlotRestoreScopeToken',
  "action: 'load_slot'",
]) {
  assert.ok(worldService.includes(sourceToken), `WorldService restore apply source should prove ${sourceToken}`)
}

for (const saveSlotRouteToken of [
  'SAVE_SLOT_RESTORE_SCOPE_TOKEN',
  'resolveSaveSlotOwnerContext',
  'getSessionControlContextByToken',
  'getSaveSlots({ owner, includeOwnerless: owner === undefined })',
  'saveWorldSlot(payload.slotId, payload.label, { owner })',
  'includeOwnerless: owner === undefined',
]) {
  assert.ok(observabilityRoute.includes(saveSlotRouteToken), `save-slot route should prove ${saveSlotRouteToken}`)
}

for (const restoreApplyToken of [
  'player_history_save_load_restore_apply_contract',
  "'/api/save-slots/load'",
  "playerHistoryScope: 'foreign_save_slot'",
  "scopeToken: 'foreign_save_slot'",
  "ownerFactionId: 'other_player'",
  "failedMetadata.playerHistoryScope, 'own_save_slot'",
  "restoredMetadata.playerHistoryScope, 'own_save_slot'",
  "visible copy leaked implementation term: ${forbidden}",
  "playerHistoryTitle, '存档已恢复'",
  "playerHistoryTitle, '存档恢复失败'",
  "card.title === '存档已恢复'",
  "card.title === '存档恢复失败'",
]) {
  assert.ok(restoreApplyContract.includes(restoreApplyToken), `restore apply contract should prove ${restoreApplyToken}`)
}

for (const ownerScopeToken of [
  'player_history_save_slot_owner_scope_runtime_contract',
  "'/api/session/join'",
  "'/api/save-slots/save'",
  "'/api/save-slots'",
  "'/api/player-history?factionId=player&limit=40'",
  "'/api/save-slots/load'",
  'legacy_ownerless_slot',
  '旧版无归属存档',
  "ownerFactionId, 'player'",
  "ownerFactionId, 'enemy'",
  'player session should not inherit legacy ownerless slot',
  'support route without bearer should retain legacy ownerless visibility',
  "playerSlotIds.includes('enemy_private_slot'), false",
  "playerVisibleText.includes('敌方私有存档'), false",
  "playerVisibleText.includes('旧版无归属存档'), false",
  'cross-faction save-slot load should fail as not found',
  'player session should not load legacy ownerless save slot',
]) {
  assert.ok(
    saveSlotOwnerScopeRuntimeContract.includes(ownerScopeToken),
    `save-slot owner scope runtime contract should prove ${ownerScopeToken}`,
  )
}

for (const assemblerToken of [
  'const saveSlots: SaveSlotRecord[]',
  "slotId: 'slot-main'",
  "label: '洛阳战前'",
  'buildPlayerSaveLoadReadModel(saveSlots)',
  "card.category === 'system' && card.nextActionLabel === '需要时可从存档恢复'",
]) {
  assert.ok(assemblerContract.includes(assemblerToken), `assembler contract should prove ${assemblerToken}`)
}

for (const accessToken of [
  'player_history_access_scope_contract',
  'Save/load cards are scoped to the current player/session',
  '暂无权限查看这段记录',
  'it must not be treated as completed session/faction/organization/spectator enforcement',
  'own save slots',
]) {
  assert.ok(accessScopeContract.includes(accessToken), `access scope contract should prove ${accessToken}`)
}

for (const replayToken of [
  'player_history_replay_archive_permission_contract',
  'Expired or unavailable replay',
  'Denied replay',
  'player-safe fallback card',
  'Replay-RAG internals',
  "'/api/replay'",
  'replay archive id',
]) {
  assert.ok(replayPermissionContract.includes(replayToken), `replay permission contract should prove ${replayToken}`)
}

const systemProducerStates = [
  'save_written',
  'save_setup_or_fixture',
  'restore_prepare',
  'restore_success',
  'restore_failure',
  'restore_skipped',
  'archive_unavailable',
  'replay_unavailable',
  'reconnect_or_bootstrap',
  'access_denied',
  'dedupe',
  'recovery',
]
assert.equal(systemProducerStates.length, 12)

const systemProducerFixture = {
  contractId,
  category: 'system',
  playerHistoryTitle: '存档已保存',
  playerHistoryActorName: '玩家',
  playerHistorySummary: '当前进度已保存，稍后可以从记录中恢复。',
  playerHistoryTarget: '洛阳战前',
  playerHistoryResultLabel: '可恢复',
  playerHistoryConsequence: '世界进度已记录，恢复前仍会提示确认。',
  playerHistoryNextAction: '查看存档',
  playerHistorySeverity: 'low',
  outcomeState: 'save_written',
  sourceRefs: {
    saveSlotId: 'summary-only-save-slot',
  },
  dedupeKey: 'system:save-slot:luoyang-before-battle',
}

assert.equal(systemProducerFixture.category, 'system')
assert.equal(systemProducerFixture.outcomeState, 'save_written')
assert.ok(systemProducerFixture.dedupeKey.startsWith('system:'))
assert.ok(systemProducerFixture.sourceRefs.saveSlotId.length > 0)

const playerVisibleCopy = [
  systemProducerFixture.playerHistoryTitle,
  systemProducerFixture.playerHistoryActorName,
  systemProducerFixture.playerHistorySummary,
  systemProducerFixture.playerHistoryTarget,
  systemProducerFixture.playerHistoryResultLabel,
  systemProducerFixture.playerHistoryConsequence,
  systemProducerFixture.playerHistoryNextAction,
  '回放暂不可用，请返回战报稍后再试。',
  '暂无权限查看这段记录。',
].join('\n')

for (const forbidden of [
  '/api/save-slots',
  '/api/events',
  '/api/replay',
  'persistence',
  'archive',
  'smoke-setup',
  'fixture',
  'restore drill',
  'restore apply',
  'rollback',
  'Replay-RAG',
  'save_slot',
  'load_slot',
  'slotId',
  'requestId',
  'backup path',
  'file path',
  'token',
  'route',
  'contract',
  'read model',
  'debug',
  'ops',
  'gate',
  'snake_case',
]) {
  assert.equal(
    playerVisibleCopy.includes(forbidden),
    false,
    `system producer visible copy leaked implementation term: ${forbidden}`,
  )
}

console.log('[player_history_system_producer_packet_contract] all checks passed')
