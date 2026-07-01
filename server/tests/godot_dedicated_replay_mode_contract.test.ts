import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const readUtf8 = (path: string) => readFileSync(path, 'utf-8')

const authority = readUtf8('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const playerHistoryPanel = readUtf8('godot-client/scripts/ui/player_history_panel.gd')
const mainSource = readUtf8('godot-client/scripts/app/main.gd')
const packageJson = readUtf8('package.json')

const contractId = 'godot_dedicated_replay_mode_contract'

for (const required of [
  contractId,
  'dedicated_replay_mode_v1',
  'Dedicated Replay Mode Implementation',
  'dedicatedReplayScreenOpen=true',
  'replayFrameLoaded=true',
  'replaySpatialOrRoundFocus=true',
  'replayCloseReturn=true',
  'replayUnavailableCopyVisible=true',
]) {
  assert.ok(authority.includes(required), `missing dedicated replay mode authority proof: ${required}`)
}

assert.ok(
  packageJson.includes('"test:godot:dedicated-replay-mode-contract"'),
  'package.json must expose the dedicated replay mode contract command',
)

for (const panelToken of [
  'PLAYER_HISTORY_DEDICATED_REPLAY_MODE_TOKEN := "dedicated_replay_mode_v1"',
  'func configure_dedicated_replay_mode',
  'func close_dedicated_replay_mode',
  '"dedicatedReplayScreenOpen": _dedicated_replay_mode_active',
  '"dedicatedReplayModeToken": PLAYER_HISTORY_DEDICATED_REPLAY_MODE_TOKEN',
  '"replayFrameLoaded": _replay_frame_count > 0',
  '"replaySpatialOrRoundFocus": _replay_round_focus_label.strip_edges() != ""',
  '"replayCloseReturn": _dedicated_replay_close_return_target.strip_edges() != ""',
  '"replayUnavailableCopyVisible": _replay_unavailable_copy_visible',
  'ReplayCloseButton',
  'ReplayRoundFocusLabel',
  '回到战报',
  '回放已不可用',
]) {
  assert.ok(playerHistoryPanel.includes(panelToken), `PlayerHistoryPanel should expose dedicated replay mode token: ${panelToken}`)
}

for (const mainToken of [
  'panel_node.call("configure_dedicated_replay_mode"',
  '"originSurface": "battle_report_detail"',
  '"closeReturnTarget": "battle_report_detail"',
  '"sourceBattleReportId": selected_report_id',
  'dedicatedReplayScreenOpen',
  'replayFrameLoaded',
  'replaySpatialOrRoundFocus',
  'replayCloseReturn',
  'replayUnavailableCopyVisible',
]) {
  assert.ok(mainSource.includes(mainToken), `main replay-open chain should expose dedicated replay proof: ${mainToken}`)
}

const visibleCopy = [
  '战况回放',
  '可逐步查看行动结果',
  '拖动查看战况变化',
  '回到战报',
  '回放已不可用',
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
  assert.equal(visibleCopy.includes(forbidden), false, `dedicated replay visible copy leaked implementation term: ${forbidden}`)
}

console.log('[godot_dedicated_replay_mode_contract] all checks passed')
