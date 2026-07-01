import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

const historyAuthority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const mapAuthority = read('docs/PRODUCT_AUTHORITY_WORLD_MAP_SUBSTRATE_CURRENT_2026_06_11.md')
const productIndex = read('docs/PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md')
const battleReportDetail = read('godot-client/scripts/ui/battle_report_detail_page.gd')
const battleReportPanel = read('godot-client/scripts/ui/battle_report_panel.gd')
const battleReportPresenter = read('godot-client/scripts/ui/presenters/battle_report_presenter.gd')
const mainSource = read('godot-client/scripts/app/main.gd')
const visualSmokeRunner = read('godot-client/tools/run_mainline_visual_smoke.py')
const observabilityPanel = read('godot-client/scripts/ui/observability_panel.gd')
const observabilityBridge = read('godot-client/scripts/infra/observability/observability_bridge.gd')
const webSocket = read('server/src/ws/GameWebSocket.ts')
const app = read('server/src/app.ts')
const sharedHistoryContract = read('shared/contracts/game/history.ts')
const sharedPlayerHistoryAssembler = read('shared/domain/playerHistory.ts')
const sharedPlayerHistoryAssemblerTest = read('server/tests/player_history_read_model_assembler_contract.test.ts')
const packageJson = read('package.json')
const oldEngineerHub = read('docs/AI_ENGINEER_HUB_2026_03_25.md')
const oldGodotWeek1 = read('docs/TASK_2026_04_05_GODOT_WEEK1_EXEC_CARDS.md')
const oldProjectNarrative = read('docs/PROJECT_EVOLUTION_NARRATIVE_2026_04_09.md')
const oldCloseoutB2C21 = read('docs/CLOSEOUT_B2_C21_2026_04_10.md')
const oldCloseoutB2C22 = read('docs/CLOSEOUT_B2_C22_2026_04_10.md')
const oldCloseoutB2C23 = read('docs/CLOSEOUT_B2_C23_2026_04_10.md')
const oldQuickNav = read('docs/AI_QUICK_NAV_INDEX_2026_04_10.md')
const oldEngineerOrg = read('docs/AI_ENGINEER_ORG_2026_03_25.md')
const oldM11 = read('docs/modules_v2/M11.md')
const oldM18 = read('docs/modules_v2/M18.md')

for (const required of [
  'Battle',
  'Court',
  'Diplomacy',
  'Economy / city',
  'AI activity',
  'Organization / nation',
]) {
  assert.ok(
    historyAuthority.includes(`| ${required} |`),
    `player history authority should define ${required} translation category`,
  )
}

assert.ok(
  historyAuthority.includes('code/support layer passed, player UI not accepted'),
  'player history authority should keep support-layer proof separate from player UI acceptance',
)
assert.ok(
  historyAuthority.includes('complete independent combat replay screen') &&
    historyAuthority.includes('player save/load screen') &&
    historyAuthority.includes('Stage 288 proves battle-report ReplayButton navigation') &&
    historyAuthority.includes('backend restore success/failure cycle') &&
    historyAuthority.includes('player_history_replay_interaction_motion_v1'),
  'player history authority should keep independent replay and backend restore gaps while recording the accepted battle-report replay route',
)
for (const requiredContract of [
  'player_world_timeline_read_model_v1',
  'battle_replay_action_frame_v1',
  'player_save_load_slots_v1',
  'civil_memory_history_card_v1',
]) {
  assert.ok(
    historyAuthority.includes(requiredContract),
    `player history authority should define next-layer contract ${requiredContract}`,
  )
}
for (const nextLayerSection of [
  'Next-Layer Source Coverage Contract',
  'Access / Rate-Limit / Privacy Contract',
  'Replay Screen Acceptance Phases',
  'Save / Load Acceptance Phases',
  '`dedicated_combat_replay_screen` Minimum Matrix',
  '`player_save_load_restore_feedback_contract` Minimum Matrix',
  'Raw Event / Civil Memory Translation Rules',
  'Legacy Module Source Handling',
  'Player History Lifecycle / Surface Contract Matrix',
  'Player-Facing Surface State Matrix',
  'Executable Acceptance Packet Queue',
]) {
  assert.ok(historyAuthority.includes(nextLayerSection), `player history authority should define ${nextLayerSection}`)
}
for (const lifecycleStep of [
  'origin_fact',
  'player_safe_overlay',
  'dedupe_and_scope',
  'timeline_card',
  'origin_recovery_link',
  'replay_or_detail',
  'save_restore_feedback',
  'notification_anchor',
]) {
  assert.ok(historyAuthority.includes(`| \`${lifecycleStep}\` |`), `player history lifecycle should define ${lifecycleStep}`)
}
for (const surfaceState of [
  'world_timeline_surface',
  'battle_report_replay_surface',
  'save_load_surface',
  'raw_event_import_surface',
  'history_notification_surface',
]) {
  assert.ok(historyAuthority.includes(`| \`${surfaceState}\` |`), `player history surface matrix should define ${surfaceState}`)
}
for (const executablePacket of [
  'timeline_real_producer_packet',
  'timeline_http_player_scope_packet',
  'timeline_godot_surface_packet',
  'dedicated_replay_screen_packet',
  'save_load_restore_apply_packet',
  'raw_event_civil_memory_translation_packet',
  'history_notification_anchor_packet',
]) {
  assert.ok(historyAuthority.includes(`| \`${executablePacket}\` |`), `player history executable queue should define ${executablePacket}`)
}
for (const formalEntry of [
  'npm.cmd run test:world:player-history-timeline-authority-contract',
  'npm.cmd run test:world:player-history-read-model-assembler-contract',
  'npm.cmd run test:world:player-history-read-model-http-contract',
  'npm.cmd run test:godot:player-history-panel-contract',
  'battle_report_detail_replay_screen_open',
  'player_history_seeded_save_restore_panel_open',
]) {
  assert.ok(historyAuthority.includes(formalEntry), `player history executable queue should route through ${formalEntry}`)
}
for (const sourceLane of [
  'Battle / combat',
  'Court / governance',
  'Diplomacy / alliance',
  'Economy / city',
  'Organization / nation',
  'Map / territory',
  'System / save',
]) {
  assert.ok(historyAuthority.includes(`| ${sourceLane} |`), `player history source coverage should include ${sourceLane}`)
}
for (const accessContract of [
  'player_history_access_scope_contract',
  'player_history_event_stream_rate_limit_contract',
  'player_history_replay_archive_permission_contract',
  'bounded page sizes and stable cursors',
  'rate-limited and deduplicated',
  'Access / Rate-Limit Future Contracts',
  'session token',
  'faction scope',
  'governed organization scope',
  'explicit spectator mode',
  'denied cross-faction private AI proposal fixture',
  'page size clamp',
  'cursor or since token',
  'dedupe key',
  'per-surface notification budget',
  'authorized replay lookup',
  'expired/unavailable replay copy',
  'denied replay fixture',
  '`player_history_access_scope_contract` Minimum Matrix',
  'Human player faction',
  'Alliance / nation officer',
  'Explicit spectator / replay share',
  'Support / ops tooling',
  '暂无权限查看这段记录',
  '该记录仅限相关成员查看',
  '这段回放未开放查看',
  'allowed own-faction fixture',
  'allowed organization-scope fixture',
  '`player_history_event_stream_rate_limit_contract` Minimum Matrix',
  'Timeline page fetch',
  'Notification badge/toast',
  'Live event stream preview',
  'Replay/history refresh',
  'Civil Memory import',
  'limit <= 80',
  'cooldown window',
  'durable history card anchor',
  '更多新动态',
  'default-SSE fixture',
  'denied/default-SSE fixture',
  '/api/events',
  'SSE',
  'backend timing',
  'replayLimit',
  'timeline_page_clamped',
  'toast_dedupe_budgeted',
  'live_preview_backpressure',
  'replay_refresh_bounded',
  'civil_memory_import_capped',
  'raw_stream_denied_default',
  'historyPageLimit',
  'historyCursorStable',
  'historyDedupeKey',
  'historyNotificationBudget',
  'historyCooldownApplied',
  'historyDurableCardAnchor',
  'docs/modules_v2/M05.md',
  'docs/modules_v2/M11.md',
  'docs/modules_v2/M18.md',
  'docs/modules_v2/M01.md',
  'docs/modules_v2/M12.md',
  'docs/modules_v2/M15.md',
  'must not be used as player-history product proof',
  'player-safe Civil Memory history-card translation',
  'player timeline, replay screen, battle-report detail, save/load UI',
  'player-facing completion',
]) {
  assert.ok(historyAuthority.includes(accessContract), `player history authority should require ${accessContract}`)
}
for (const forbiddenAccessBehavior of [
  'public cross-faction history dump',
  'provider diagnostics',
  'hidden diplomacy/Court metadata leak',
  'unbounded SSE feed as player timeline',
  'repeated identical toasts',
  'Replay-RAG internals',
  'private AI chat/voice payload',
  'raw 404/500 payload',
]) {
  assert.ok(
    historyAuthority.includes(forbiddenAccessBehavior),
    `player history access contract should forbid ${forbiddenAccessBehavior}`,
  )
}
for (const phase of [
  'replay_panel_preview',
  'replay_interaction_controls',
  'battle_report_replay_route',
  'dedicated_combat_replay_screen',
  'replay_permission_and_retention',
  'save_slot_list_read_model',
  'local_restore_prepare_feedback',
  'backend_restore_success_failure',
  'restore_risk_confirmation',
  'save_load_screen_completion',
]) {
  assert.ok(historyAuthority.includes(`| \`${phase}\` |`), `player history authority should define phase ${phase}`)
}
for (const replaySaveMatrixTerm of [
  'opening',
  'frame_loaded',
  'inspect_action',
  'step_scrub_pause',
  'map_or_round_focus',
  'close_return',
  'unauthorized_or_expired',
  'dedicatedReplayScreenOpen=true',
  'replayActionFrameInspection=true',
  'replayPauseStepScrub=true',
  'replaySpatialOrRoundFocus=true',
  'replayUnavailableCopyVisible=true',
  'slot_list',
  'risk_confirm',
  'restore_pending',
  'restore_success',
  'restore_failure',
  'restore_skipped',
  'archive_unavailable',
  'restoreRiskConfirmVisible=true',
  'restoreSuccessFeedback=true',
  'restoreFailureFeedback=true',
  'restoreSkippedFeedback=true',
]) {
  assert.ok(
    historyAuthority.includes(replaySaveMatrixTerm),
    `player history authority should define replay/save-load matrix term ${replaySaveMatrixTerm}`,
  )
}
for (const translationRule of [
  'typed translators',
  'metadata.playerHistory*',
  'Technical identity is never the visible title',
  'future dedupe key',
  'durable card',
]) {
  assert.ok(historyAuthority.includes(translationRule), `player history authority should define translation rule ${translationRule}`)
}
for (const forbiddenLeakage of ['raw event type', 'route name', 'snake_case', '/api/save-slots/*', 'memory provider']) {
  assert.ok(
    historyAuthority.includes(forbiddenLeakage),
    `player history authority should explicitly forbid ${forbiddenLeakage} leakage`,
  )
}

const playerHistoryContractSlice = sharedHistoryContract.slice(
  sharedHistoryContract.indexOf('export type PlayerWorldTimelineCategory'),
)

for (const requiredSharedContract of [
  'PlayerWorldTimelineReadModel',
  'BattleReplayScreenReadModel',
  'PlayerSaveLoadReadModel',
  'CivilMemoryHistoryCard',
  "contractId: 'player_world_timeline_read_model_v1'",
  "contractId: 'battle_replay_action_frame_v1'",
  "contractId: 'player_save_load_slots_v1'",
  "contractId: 'civil_memory_history_card_v1'",
]) {
  assert.ok(
    playerHistoryContractSlice.includes(requiredSharedContract),
    `shared player history contract should define ${requiredSharedContract}`,
  )
}

for (const playerSafeField of [
  'actorName',
  'locationLabel',
  'resultLabel',
  'consequenceLabel',
  'nextActionLabel',
  'timestampBucket',
  'selectedFrameIndex',
  'frameCountLabel',
  'inspectionHintLabel',
  'timelineScrubLabel',
  'selectedSlotId',
  'restoreRiskLabel',
  'restoreFeedbackLabel',
  'emptyStateLabel',
  'riskHint',
  'restorePreviewLabel',
  'causeLabel',
  'currentImpactLabel',
  'suggestedFollowUpLabel',
]) {
  assert.ok(
    playerHistoryContractSlice.includes(playerSafeField),
    `shared player history contract should expose player-safe field ${playerSafeField}`,
  )
}

for (const forbiddenSharedField of ['rawEventType', 'routeName', 'apiPath', 'memoryProvider', 'snake_case']) {
  assert.ok(
    !playerHistoryContractSlice.includes(forbiddenSharedField),
    `shared player history contract should not expose ${forbiddenSharedField}`,
  )
}

for (const requiredAssembler of [
  'buildPlayerWorldTimelineReadModel',
  'buildBattleReplayScreenReadModel',
  'buildPlayerSaveLoadReadModel',
  'buildCivilMemoryHistoryCards',
]) {
  assert.ok(
    sharedPlayerHistoryAssembler.includes(`export function ${requiredAssembler}`),
    `shared player history assembler should export ${requiredAssembler}`,
  )
}
for (const nextLayerAssemblerField of [
  'selectedFrameIndex',
  'frameCountLabel',
  'inspectionHintLabel',
  'timelineScrubLabel',
  'selectedSlotId',
  'restoreRiskLabel',
  'restoreFeedbackLabel',
  'emptyStateLabel',
]) {
  assert.ok(
    sharedPlayerHistoryAssembler.includes(nextLayerAssemblerField),
    `shared player history assembler should populate next-layer field ${nextLayerAssemblerField}`,
  )
}
for (const requiredOverlay of [
  'playerHistoryCategory',
  'playerHistoryTitle',
  'playerHistoryActorName',
  'playerHistoryLocation',
  'playerHistoryTarget',
  'playerHistoryResultLabel',
  'playerHistoryConsequence',
  'playerHistoryNextAction',
  'playerHistorySeverity',
]) {
  assert.ok(
    sharedPlayerHistoryAssembler.includes(requiredOverlay),
    `shared player history assembler should support player-safe event overlay ${requiredOverlay}`,
  )
  assert.ok(
    sharedPlayerHistoryAssemblerTest.includes(requiredOverlay),
    `assembler contract should prove player-safe event overlay ${requiredOverlay}`,
  )
}
assert.ok(
  sharedPlayerHistoryAssembler.includes('isPlayerWorldTimelineCategory'),
  'shared player history assembler should validate player-safe event overlay categories',
)
for (const directCategory of ['court', 'diplomacy', 'economy_city', 'organization_nation', 'ai_activity', 'map_change']) {
  assert.ok(
    sharedPlayerHistoryAssemblerTest.includes(`category === '${directCategory}'`),
    `assembler contract should prove direct ${directCategory} timeline source mapping`,
  )
}
for (const forbiddenAssemblerLeakage of ['apiPath', 'memoryProvider', 'rawEventType', 'routeName']) {
  assert.ok(
    sharedPlayerHistoryAssemblerTest.includes(forbiddenAssemblerLeakage),
    `assembler contract fixture should explicitly guard against ${forbiddenAssemblerLeakage} leakage in tests or conversion notes`,
  )
}
assert.ok(
  packageJson.includes('test:world:player-history-read-model-assembler-contract'),
  'package scripts should expose player history read-model assembler contract',
)
assert.ok(
  packageJson.includes('test:world:player-history-read-model-http-contract'),
  'package scripts should expose player history read-model HTTP contract',
)

assert.ok(battleReportDetail.includes('@onready var _replay_button: Button'), 'battle report detail should own a real ReplayButton')
assert.ok(
  battleReportDetail.includes('_apply_detail_button_governance(_replay_button, "battle_report_detail_replay"'),
  'battle report replay button should keep governed action identity',
)
assert.ok(
  battleReportDetail.includes('signal replay_requested(payload: Dictionary)') &&
    battleReportDetail.includes('"battleReportDetailReplayRequestId"') &&
    battleReportDetail.includes('replay_requested.emit({') &&
    !battleReportDetail.includes('回放入口已保留；后续接正式回放链。'),
  'battle report replay button should emit a real replay request instead of default-entry placeholder copy',
)
assert.ok(
  battleReportPanel.includes('signal replay_requested(payload: Dictionary)') &&
    battleReportPanel.includes('_detail_page.connect("replay_requested"') &&
    battleReportPanel.includes('func _on_replay_requested(payload: Dictionary) -> void:'),
  'battle report panel should bubble detail replay requests to the shell',
)
assert.ok(
  battleReportPresenter.includes('func _resolve_replay_request_id_for_report(') &&
    battleReportPresenter.includes('"replay_request_id"') &&
    battleReportPresenter.includes('"replay_available"') &&
    !battleReportPresenter.includes('可供后续接线'),
  'battle report presenter should bind a usable replay request id and avoid future-wire placeholder language',
)
assert.ok(
  mainSource.includes('"battle_report_detail_replay_screen_open"') &&
    mainSource.includes('var is_battle_report_replay_screen_action := click_action == "battle_report_detail_replay_screen_open"') &&
    mainSource.includes('var expected_click_active_panel_id := "player_history" if is_battle_report_replay_screen_action else panel_id') &&
    mainSource.includes('func _press_mainline_visual_smoke_battle_report_detail_replay_screen_open') &&
    mainSource.includes('func _on_battle_report_replay_requested(payload: Dictionary) -> void:') &&
    mainSource.includes('await panel_node.call("refresh_from_backend", 80, replay_request_id)'),
  'main smoke/runtime should route battle-report ReplayButton into filtered player-history replay screen',
)
assert.ok(
  visualSmokeRunner.includes('"battle_report_detail_replay_screen_open"') &&
    visualSmokeRunner.includes('PLAYER_HISTORY_REPLAY_SEEDED_ACTIONS') &&
    visualSmokeRunner.includes('BATTLE_REPORT_SEEDED_CLOSURE_ACTIONS'),
  'visual smoke runner should seed both battle reports and execution replay for ReplayButton screen-open proof',
)

assert.ok(observabilityPanel.includes('observability_panel'), 'observability panel should remain identifiable as an observability surface')
assert.ok(observabilityBridge.includes('get_events(events_limit)'), 'observability bridge should consume backend events as support telemetry')

assert.ok(webSocket.includes('token required for human-controlled faction subscription'), 'WS human faction subscribe should require token')
assert.ok(webSocket.includes("type: 'battle_report'"), 'WS should keep battle report push event type')
assert.ok(app.includes("requestUrl.pathname === '/api/events/stream'"), 'HTTP SSE event stream route should exist as support layer')
assert.ok(app.includes("requestUrl.pathname === '/api/save-slots/load'"), 'backend save-slot load route should exist as support layer')
assert.ok(app.includes("requestUrl.pathname === '/api/player-history'"), 'player-safe history read model route should exist')
assert.ok(app.includes('handlePlayerHistoryRoute(req, res)'), 'player history route should use the player-safe handler')

const demotedOldSources = [
  oldEngineerHub,
  oldGodotWeek1,
  oldProjectNarrative,
  oldCloseoutB2C21,
  oldCloseoutB2C22,
  oldCloseoutB2C23,
  oldQuickNav,
  oldM11,
  oldM18,
]

for (const source of demotedOldSources) {
  assert.ok(
    source.includes('2026-06-11 status:') && source.includes('PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md'),
    'old player-history/replay/save source should route readers to current authority first',
  )
}

assert.ok(
  oldCloseoutB2C21.includes('POST /api/save-slots/fixture/prime') &&
    oldCloseoutB2C21.includes('obsolete') &&
    oldCloseoutB2C21.includes('POST /api/save-slots/smoke-setup/prime'),
  'old fixture prime closeout should explicitly mark fixture route obsolete and point to smoke setup route',
)

assert.ok(
  oldEngineerOrg.includes('2026-06-11 status: superseded historical organization matrix') &&
    oldEngineerOrg.includes('AGENTS_EXECUTION_CURRENT_2026_04.md') &&
    oldEngineerOrg.includes('CURRENT_HANDOFF_INDEX_2026_06_05.md'),
  'old organization matrix should no longer claim active ownership without current routing',
)

for (const text of [mapAuthority, productIndex]) {
  assert.ok(text.includes('20,396,493'), 'map docs should expose resource-eligible land cell count')
  assert.ok(text.includes('7,403,045'), 'map docs should expose maritime navigation cell count')
  assert.ok(text.includes('27,799,538'), 'map docs should expose loadable land-or-sea cell count')
  assert.ok(
    text.includes('not the product playable-scale') || text.includes('Do not describe the product map as `5963 万 cells`'),
    'map docs should reject using source raster extent as product playable scale',
  )
}

assert.ok(productIndex.includes('Modeling Status Dashboard'), 'product index should include a modeling status dashboard')
for (const dashboardRow of [
  '| Player history/replay/save UI | modeled with executable packets | partial |',
  '| Motion/animation/effects | modeled with inventory and packets | partial |',
  '| World map substrate | strongly modeled | implemented/partial by layer |',
  '| Organization/nation ladder | modeled | partial/vision by tier |',
  '| Sea/naval/overseas | supporting model | narrow partial slice |',
]) {
  assert.ok(productIndex.includes(dashboardRow), `product index modeling dashboard should include ${dashboardRow}`)
}

console.log('[player_history_timeline_authority_contract] all checks passed')
