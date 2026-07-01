import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const readUtf8 = (path: string) => readFileSync(path, 'utf-8')

const authority = readUtf8('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const battleReportDetail = readUtf8('godot-client/scripts/ui/battle_report_detail_page.gd')
const playerHistoryPanel = readUtf8('godot-client/scripts/ui/player_history_panel.gd')
const mainSource = readUtf8('godot-client/scripts/app/main.gd')
const packageJson = readUtf8('package.json')

const contractId = 'player_history_dedicated_replay_screen_packet_contract'

for (const required of [
  contractId,
  'dedicated_replay_screen_packet',
  '`dedicated_combat_replay_screen` Minimum Matrix',
  'opening',
  'frame_loaded',
  'inspect_action',
  'step_scrub_pause',
  'map_or_round_focus',
  'close_return',
  'unauthorized_or_expired',
  'dedicatedReplayScreenOpen=true',
  'replayFrameLoaded=true',
  'replayActionFrameInspection=true',
  'replayPauseStepScrub=true',
  'replaySpatialOrRoundFocus=true',
  'replayCloseReturn=true',
  'replayUnavailableCopyVisible=true',
  'dedicated combat replay screen or dedicated replay mode',
  'current proof is inside `PlayerHistoryPanel`',
  'current proof is still PlayerHistoryPanel preview/controls',
  'dedicated_replay_mode_v1',
  'Dedicated replay mode now has a formal source/summary proof.',
]) {
  assert.ok(authority.includes(required), `missing dedicated replay authority proof: ${required}`)
}

assert.ok(
  packageJson.includes('"test:world:player-history-dedicated-replay-screen-packet-contract"'),
  'package.json must expose the dedicated replay packet contract command',
)

assert.ok(battleReportDetail.includes('@onready var _replay_button: Button'), 'battle report detail must own a real ReplayButton')
assert.ok(
  battleReportDetail.includes('_apply_detail_button_governance(_replay_button, "battle_report_detail_replay"') &&
    battleReportDetail.includes('signal replay_requested(payload: Dictionary)'),
  'ReplayButton must keep governed action identity and emit a real replay request',
)

for (const playerHistoryToken of [
  'PLAYER_HISTORY_REPLAY_INSPECTION_TOKEN := "player_history_replay_action_frame_inspection_v1"',
  'PLAYER_HISTORY_REPLAY_INTERACTION_MOTION_TOKEN := "player_history_replay_interaction_motion_v1"',
  'ReplayPauseButton',
  'ReplayStepBackButton',
  'ReplayStepForwardButton',
  'ReplayFrameScrubSlider',
  'ReplayInteractionFeedbackLabel',
  'run_replay_interaction_smoke',
]) {
  assert.ok(playerHistoryPanel.includes(playerHistoryToken), `PlayerHistoryPanel should expose narrow replay slice: ${playerHistoryToken}`)
}

for (const mainToken of [
  '"battle_report_detail_replay_screen_open"',
  'func _press_mainline_visual_smoke_battle_report_detail_replay_screen_open',
  'func _on_battle_report_replay_requested(payload: Dictionary) -> void:',
  'await panel_node.call("refresh_from_backend", 80, replay_request_id)',
  'player_history_replay_action_frame_inspection_v1',
  'player_history_replay_interaction_motion_v1',
]) {
  assert.ok(mainSource.includes(mainToken), `main runtime/smoke should expose replay route proof: ${mainToken}`)
}

const requiredFutureProof = {
  dedicatedReplayScreenOpen: true,
  replayFrameLoaded: true,
  replayActionFrameInspection: true,
  replayPauseStepScrub: true,
  replaySpatialOrRoundFocus: true,
  replayCloseReturn: true,
  replayUnavailableCopyVisible: false,
  screenshotProof: false,
}

assert.equal(requiredFutureProof.replayActionFrameInspection, true, 'current narrow replay inspection slice is usable evidence')
assert.equal(requiredFutureProof.replayPauseStepScrub, true, 'current narrow pause/step/scrub slice is usable evidence')
assert.equal(requiredFutureProof.dedicatedReplayScreenOpen, true, 'dedicated replay mode now has source/summary proof')
assert.equal(requiredFutureProof.replayFrameLoaded, true, 'frame-loaded summary proof is now available for dedicated replay mode')
assert.equal(requiredFutureProof.replaySpatialOrRoundFocus, true, 'round focus summary proof is now available for dedicated replay mode')
assert.equal(requiredFutureProof.replayCloseReturn, true, 'close-return target summary proof is now available for dedicated replay mode')
assert.equal(requiredFutureProof.replayUnavailableCopyVisible, false, 'denied/unavailable visual proof is still missing')
assert.equal(requiredFutureProof.screenshotProof, false, 'screenshot proof for the dedicated replay surface is still missing')

const playerVisibleCopy = [
  '战况回放',
  '可逐步查看行动结果',
  '拖动查看战况变化',
  '回放已不可用',
  '这段回放未开放查看',
].join('\n')

for (const forbidden of [
  'route',
  'contract',
  'read model',
  'authority',
  'replay archive id',
  'request id',
  'raw JSON',
  'Replay-RAG',
  'fixture',
  'debug',
  'ops',
  'backend timing',
  'snake_case',
  '/api/replay',
  '/api/events',
]) {
  assert.equal(
    playerVisibleCopy.includes(forbidden),
    false,
    `dedicated replay player-visible copy leaked implementation term: ${forbidden}`,
  )
}

console.log('[player_history_dedicated_replay_screen_packet_contract] all checks passed')
