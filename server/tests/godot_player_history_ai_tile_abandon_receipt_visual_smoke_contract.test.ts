import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function functionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const nextFunc = source.indexOf('\nfunc ', start + signature.length)
  const end = nextFunc > start ? nextFunc : source.length
  return source.slice(start, end)
}

const playerHistoryPanel = read('godot-client/scripts/ui/player_history_panel.gd')
const mainSource = read('godot-client/scripts/app/main.gd')
const runnerSource = read('godot-client/tools/run_mainline_visual_smoke.py')
const packageJson = read('package.json')
const handoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')

const action = 'player_history_ai_tile_abandon_receipt_visible'
const contract = 'player_history_ai_tile_abandon_receipt_visual_smoke_v1'
const focusedToken = 'player_history_ai_execution_receipt_focused_v1'
const feedback = '已记录地块放弃结果'

const focusedReceipt = functionSource(playerHistoryPanel, 'func run_ai_tile_abandon_execution_receipt_visible_smoke() -> Dictionary:')
const mainBridge = functionSource(mainSource, 'func _press_mainline_visual_smoke_player_history_ai_tile_abandon_receipt_visible(panel_id: String) -> Dictionary:')
const clickRouter = functionSource(mainSource, 'func _run_mainline_visual_smoke_click_action(click_action: String, panel_id: String) -> Dictionary:')

assert.ok(
  playerHistoryPanel.includes(`PLAYER_HISTORY_AI_EXECUTION_RECEIPT_FOCUSED_TOKEN := "${focusedToken}"`) &&
    focusedReceipt.includes('_show_timeline_recovery_focused_receipt("ai_execution_receipt"') &&
    focusedReceipt.includes('放弃目标地块') &&
    focusedReceipt.includes('地块已释放') &&
    focusedReceipt.includes('查看 AI 活动') &&
    focusedReceipt.includes(feedback),
  'PlayerHistoryPanel must expose a focused AI tile-abandon execution receipt with short player copy.',
)

assert.ok(
  mainBridge.includes('run_ai_tile_abandon_execution_receipt_visible_smoke') &&
    mainBridge.includes(contract) &&
    mainBridge.includes('"expectedPanelId"] = "player_history"') &&
    mainBridge.includes(feedback),
  'main.gd must expose a dedicated player-history tile-abandon receipt visual smoke bridge.',
)

assert.ok(
  clickRouter.includes(`"${action}"`) &&
    clickRouter.includes('_press_mainline_visual_smoke_player_history_ai_tile_abandon_receipt_visible(panel_id)'),
  'main.gd must route the tile-abandon receipt visual smoke click action.',
)

assert.ok(
  runnerSource.includes(`"${action}"`) &&
    runnerSource.includes('_validate_player_history_ai_tile_abandon_receipt_visual_smoke') &&
    runnerSource.includes(contract) &&
    runnerSource.includes('playerHistoryAiTileAbandonReceiptScreenshotPath'),
  'visual smoke runner must register and validate the tile-abandon receipt screenshot action.',
)

assert.ok(
  packageJson.includes('"test:godot:player-history-ai-tile-abandon-receipt-visual-smoke-contract"'),
  'package.json must expose the formal tile-abandon receipt visual smoke contract command.',
)

assert.ok(
  handoff.includes('Stage 637') &&
    handoff.includes(action) &&
    handoff.includes(contract),
  'CURRENT handoff must record Stage 637 tile-abandon receipt screenshot gate.',
)

for (const forbidden of ['tile_abandon', 'abandonAiOwnedTile', 'proposalId', 'worldAction', 'JSON', 'backend', 'contract id', 'debug', 'snake_case']) {
  assert.equal([feedback, '放弃目标地块', '地块已释放', '查看 AI 活动'].join('\n').includes(forbidden), false)
}

console.log('[godot_player_history_ai_tile_abandon_receipt_visual_smoke_contract] all checks passed')
