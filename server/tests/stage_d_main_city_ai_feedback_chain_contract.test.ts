import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function functionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const nextFunc = source.indexOf('\nfunc ', start + signature.length)
  const nextStaticFunc = source.indexOf('\nstatic func ', start + signature.length)
  const candidates = [nextFunc, nextStaticFunc].filter((index) => index > start)
  const end = candidates.length > 0 ? Math.min(...candidates) : source.length
  return source.slice(start, end)
}

const packageJson = read('package.json')
const currentHandoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
const playerHistoryAuthority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const playerHistoryPanel = read('godot-client/scripts/ui/player_history_panel.gd')
const main = read('godot-client/scripts/app/main.gd')
const runner = read('godot-client/tools/run_mainline_visual_smoke.py')

const deniedFocusedReceiptSmoker = functionSource(
  main,
  'func _press_mainline_visual_smoke_player_history_ai_proposal_denied_visible_receipt(panel_id: String) -> Dictionary:',
)
const layoutSummary = functionSource(main, 'func _read_mainline_visual_smoke_overlay_panel_layout_summary(panel_id: String) -> Dictionary:')
const timelineSurfaceResolver = functionSource(main, 'func _resolve_player_history_timeline_recovery_surface(recovery_kind: String) -> String:')
const timelineSurfaceOpen = functionSource(main, 'func _open_player_history_timeline_recovery_surface(target_surface: String) -> void:')

for (const scriptName of [
  'test:stage-d:main-city-ai-feedback-chain-contract',
  'test:world:player-history-economy-city-producer-packet-contract',
  'test:world:player-history-main-city-economy-receipt-contract',
  'test:world:player-history-ai-activity-producer-packet-contract',
  'test:world:player-history-ai-activity-planning-producer-contract',
  'test:world:player-history-ai-activity-denied-producer-contract',
  'test:godot:ai-activity-history-recovery-contract',
  'test:godot:ai-proposal-apply-recovery-contract',
  'test:godot:ai-execution-receipt-recovery-contract',
  'test:godot:player-history-ai-proposal-denied-recovery-contract',
]) {
  assert.ok(packageJson.includes(`"${scriptName}"`), `package.json must expose ${scriptName}`)
}

assert.equal(
  packageJson.includes('global-product-modeling-optimality-contract') &&
    packageJson.includes('test:stage-d:main-city-ai-feedback-chain-contract') &&
    packageJson.indexOf('test:stage-d:main-city-ai-feedback-chain-contract') > packageJson.indexOf('global-product-modeling-optimality-contract'),
  false,
  'Stage D chain gate must not be defined as a continuation of the old global product-modeling lane',
)

for (const stageFact of [
  'Stage D - Main-city economy feedback + AI apply-success / denied / execution receipt',
  'MainCityHubOverlay',
  'PlayerHistoryPanel',
  'WorldService',
  'Boundary: do not merge three narrow AI receipt paths into one complete product chain until visible proof exists',
]) {
  assert.ok(currentHandoff.includes(stageFact), `CURRENT handoff must keep Stage D scope fact: ${stageFact}`)
}

for (const authorityFact of [
  'economy_city_history_producer_packet',
  'ai_activity_history_producer_packet',
  'player_history_ai_activity_recovery_v1',
  'player_history_ai_proposal_apply_recovery_v1',
  'player_history_ai_execution_receipt_recovery_v1',
  'player_history_ai_proposal_denied_recovery_v1',
  'player_history_ai_proposal_denied_focused_receipt_v1',
]) {
  assert.ok(playerHistoryAuthority.includes(authorityFact) || playerHistoryPanel.includes(authorityFact), `Stage D authority must keep ${authorityFact}`)
}

for (const panelFact of [
  'PLAYER_HISTORY_AI_ACTIVITY_RECOVERY_TOKEN := "player_history_ai_activity_recovery_v1"',
  'PLAYER_HISTORY_AI_PROPOSAL_APPLY_RECOVERY_TOKEN := "player_history_ai_proposal_apply_recovery_v1"',
  'PLAYER_HISTORY_AI_EXECUTION_RECEIPT_RECOVERY_TOKEN := "player_history_ai_execution_receipt_recovery_v1"',
  'PLAYER_HISTORY_AI_PROPOSAL_DENIED_RECOVERY_TOKEN := "player_history_ai_proposal_denied_recovery_v1"',
  'PLAYER_HISTORY_AI_PROPOSAL_DENIED_FOCUSED_RECEIPT_TOKEN := "player_history_ai_proposal_denied_focused_receipt_v1"',
  'func run_ai_activity_timeline_recovery_smoke() -> Dictionary:',
  'func run_ai_proposal_apply_timeline_recovery_smoke() -> Dictionary:',
  'func run_ai_execution_receipt_timeline_recovery_smoke() -> Dictionary:',
  'func run_ai_proposal_denied_timeline_recovery_smoke() -> Dictionary:',
  'func run_ai_proposal_denied_visible_receipt_smoke() -> Dictionary:',
]) {
  assert.ok(playerHistoryPanel.includes(panelFact), `PlayerHistoryPanel must keep Stage D recovery fact: ${panelFact}`)
}

assert.ok(
  timelineSurfaceResolver.includes('"ai_activity"') &&
    timelineSurfaceResolver.includes('"ai_proposal_apply"') &&
    timelineSurfaceResolver.includes('"ai_execution_receipt"') &&
    timelineSurfaceResolver.includes('"ai_proposal_denied"') &&
    timelineSurfaceOpen.includes('ai_activity_opened_via_ai_hub') &&
    timelineSurfaceOpen.includes('_open_overlay_panel("ai_hub")'),
  'Stage D recovery host must route AI history/application/receipt lanes to the real AI panel',
)

assert.ok(
  deniedFocusedReceiptSmoker.includes('run_ai_proposal_denied_visible_receipt_smoke') &&
    deniedFocusedReceiptSmoker.includes('player_history_ai_proposal_denied_focused_receipt_visual_smoke_v1') &&
    deniedFocusedReceiptSmoker.includes('timelineRecoveryFocusedReceiptKind') &&
    deniedFocusedReceiptSmoker.includes('ai_proposal_denied'),
  'Stage D denied focused receipt must remain a visible Godot smoke chain',
)

assert.ok(
  layoutSummary.includes('panel_id == "player_history"') &&
    layoutSummary.includes('_full_screen_panel_host') &&
    layoutSummary.includes('panel_root = _full_screen_panel_host as Control'),
  'PlayerHistory content summaries may use generated content, but Stage D visible receipt layout must still validate full-screen chrome',
)

assert.ok(
  runner.includes('"player_history_ai_proposal_denied_visible_receipt"') &&
    runner.includes('_seed_player_history_ai_proposal_denied') &&
    runner.includes('_validate_player_history_ai_proposal_denied_focused_receipt_visual_smoke'),
  'Stage D must keep the formal denied receipt screenshot seed and validator',
)

console.log('[stage_d_main_city_ai_feedback_chain_contract] all checks passed')
