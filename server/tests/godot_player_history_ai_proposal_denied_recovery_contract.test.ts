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

const deniedResolver = functionSource(playerHistoryPanel, 'func _resolve_ai_proposal_denied_recovery_kind(visible_payload: Dictionary) -> String:')
const deniedSmoke = functionSource(playerHistoryPanel, 'func run_ai_proposal_denied_timeline_recovery_smoke() -> Dictionary:')
const deniedFocusedReceipt = functionSource(playerHistoryPanel, 'func run_ai_proposal_denied_visible_receipt_smoke() -> Dictionary:')
const hostHandler = functionSource(mainSource, 'func _on_player_history_timeline_recovery_requested(recovery_kind: String) -> void:')
const surfaceResolver = functionSource(mainSource, 'func _resolve_player_history_timeline_recovery_surface(recovery_kind: String) -> String:')
const deniedSmoker = functionSource(mainSource, 'func _press_mainline_visual_smoke_player_history_ai_proposal_denied(panel_id: String) -> Dictionary:')
const deniedFocusedReceiptSmoker = functionSource(mainSource, 'func _press_mainline_visual_smoke_player_history_ai_proposal_denied_visible_receipt(panel_id: String) -> Dictionary:')

assert.ok(
  playerHistoryPanel.includes('PLAYER_HISTORY_AI_PROPOSAL_DENIED_RECOVERY_TOKEN := "player_history_ai_proposal_denied_recovery_v1"'),
  'PlayerHistoryPanel must own a stable denied recovery token.',
)
assert.ok(
  playerHistoryPanel.includes('PLAYER_HISTORY_AI_PROPOSAL_DENIED_FOCUSED_RECEIPT_TOKEN := "player_history_ai_proposal_denied_focused_receipt_v1"') &&
    playerHistoryPanel.includes('func _show_timeline_recovery_focused_receipt('),
  'PlayerHistoryPanel must expose a stable focused receipt token and visible receipt builder.',
)
assert.ok(
  playerHistoryPanel.includes('if recovery_kind == "ai_activity":') &&
    playerHistoryPanel.includes('_resolve_ai_proposal_denied_recovery_kind(visible_payload)'),
  'AI activity cards must consider denied recovery before apply/receipt recovery.',
)
assert.ok(
  deniedResolver.includes('AI 行动受阻') &&
    deniedResolver.includes('查看 AI 活动') &&
    deniedResolver.includes('ai_proposal_denied'),
  'Denied recovery resolver must recognize the player-visible denied card copy.',
)
assert.ok(
  deniedSmoke.includes('_on_timeline_recovery_pressed(feedback_label, "ai_proposal_denied"') &&
    deniedSmoke.includes('"aiProposalDeniedRecoveryToken"') &&
    deniedSmoke.includes('PLAYER_HISTORY_AI_PROPOSAL_DENIED_RECOVERY_TOKEN'),
  'PlayerHistoryPanel must expose a denied recovery smoke helper.',
)
assert.ok(
  deniedFocusedReceipt.includes('_show_timeline_recovery_focused_receipt("ai_proposal_denied"') &&
    deniedFocusedReceipt.includes('已记录 AI 提案驳回') &&
    deniedFocusedReceipt.includes('PLAYER_HISTORY_AI_PROPOSAL_DENIED_FOCUSED_RECEIPT_TOKEN'),
  'PlayerHistoryPanel must expose a screenshot-visible denied focused receipt helper.',
)
assert.ok(
  hostHandler.includes('if resolved_kind == "ai_proposal_denied":') &&
    hostHandler.includes('已记录 AI 提案驳回'),
  'main.gd must expose player-safe denied feedback for AI proposal recovery.',
)
assert.ok(
  surfaceResolver.includes('"ai_proposal_denied"') &&
    surfaceResolver.includes('return "ai_hub"'),
  'Denied AI proposal recovery must reuse the AI hub surface.',
)
assert.ok(
  deniedSmoker.includes('run_ai_proposal_denied_timeline_recovery_smoke') &&
    deniedSmoker.includes('aiProposalDeniedRecoveryVisualSmokeContract') &&
    deniedSmoker.includes('ai_activity_opened_via_ai_hub'),
  'main.gd must provide a dedicated denied recovery visual smoke bridge.',
)
assert.ok(
  deniedFocusedReceiptSmoker.includes('run_ai_proposal_denied_visible_receipt_smoke') &&
    deniedFocusedReceiptSmoker.includes('aiProposalDeniedFocusedReceiptVisualSmokeContract') &&
    deniedFocusedReceiptSmoker.includes('player_history_ai_proposal_denied_focused_receipt_visual_smoke_v1') &&
    deniedFocusedReceiptSmoker.includes('expectedPanelId"] = "player_history"'),
  'main.gd must provide a focused denied receipt smoke that stays on Player History for screenshot evidence.',
)
assert.ok(
  runnerSource.includes('"player_history_ai_proposal_denied_panel_open"') &&
    runnerSource.includes('"player_history_ai_proposal_denied_visible_receipt"') &&
    runnerSource.includes('PLAYER_HISTORY_AI_PROPOSAL_DENIED_SEEDED_ACTIONS') &&
    runnerSource.includes('_seed_player_history_ai_proposal_denied') &&
    runnerSource.includes('_validate_player_history_ai_proposal_denied_recovery_visual_smoke') &&
    runnerSource.includes('_validate_player_history_ai_proposal_denied_focused_receipt_visual_smoke'),
  'visual smoke runner must seed and validate both denied AI proposal recovery and focused receipt slices.',
)
assert.ok(
  packageJson.includes('"test:godot:player-history-ai-proposal-denied-recovery-contract"') &&
    packageJson.includes('"test:world:player-history-ai-activity-denied-producer-contract"'),
  'package.json must expose formal commands for the denied AI recovery slice.',
)

for (const forbidden of ['read model', 'authority', 'tier', 'backend', 'contract id', 'debug', 'snake_case']) {
  assert.equal(
    '已记录 AI 提案驳回'.includes(forbidden),
    false,
    `denied AI recovery feedback leaked engineering term: ${forbidden}`,
  )
}

console.log('[godot_player_history_ai_proposal_denied_recovery_contract] all checks passed')
