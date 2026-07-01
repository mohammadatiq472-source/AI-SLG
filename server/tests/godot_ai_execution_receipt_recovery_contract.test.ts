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
const handoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
const productIndex = read('docs/PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md')
const aiGovernance = read('docs/PRODUCT_AUTHORITY_AI_PLAYER_GOVERNANCE_CURRENT_2026_06_10.md')
const radar = read('docs/PLAYER_HISTORY_PRODUCER_COVERAGE_RADAR_CURRENT_2026_06_13.md')
const packetContract = read('server/tests/player_history_ai_activity_producer_packet_contract.test.ts')

const recoveryToken = 'player_history_ai_execution_receipt_recovery_v1'
const receiptRecoveryKind = 'ai_execution_receipt'
const playerFeedback = '已准备查看 AI 执行回执'

const sanitizer = functionSource(playerHistoryPanel, 'func _sanitize_timeline_card_for_visible_copy(card: Dictionary) -> Dictionary:')
const receiptResolver = functionSource(playerHistoryPanel, 'func _resolve_ai_execution_receipt_recovery_kind(visible_payload: Dictionary) -> String:')
const tokenResolver = functionSource(playerHistoryPanel, 'func _resolve_timeline_recovery_internal_token(recovery_kind: String, source_refs: Dictionary) -> String:')
const receiptSmoke = functionSource(playerHistoryPanel, 'func run_ai_execution_receipt_timeline_recovery_smoke() -> Dictionary:')
const hostHandler = functionSource(mainSource, 'func _on_player_history_timeline_recovery_requested(recovery_kind: String) -> void:')
const surfaceResolver = functionSource(mainSource, 'func _resolve_player_history_timeline_recovery_surface(recovery_kind: String) -> String:')
const surfaceOpen = functionSource(mainSource, 'func _open_player_history_timeline_recovery_surface(target_surface: String) -> void:')

assert.ok(
  packetContract.includes("metadata.playerHistoryTitle, 'AI 行动已完成'") &&
    packetContract.includes("metadata.playerHistoryNextAction, '查看 AI 活动'") &&
    packetContract.includes("if (entry.type === 'execution_outcome') return 'ai_activity'"),
  'existing AI activity packet contracts must already expose the execution receipt card lane.',
)

assert.ok(
  playerHistoryPanel.includes(`PLAYER_HISTORY_AI_EXECUTION_RECEIPT_RECOVERY_TOKEN := "${recoveryToken}"`),
  'PlayerHistoryPanel must own a stable AI execution receipt recovery token.',
)

assert.ok(
  sanitizer.includes('_resolve_ai_execution_receipt_recovery_kind(visible_payload)') &&
    sanitizer.includes('visible_payload["recoveryActionKind"] = recovery_kind'),
  'timeline sanitizer must upgrade AI execution receipt cards after visible copy is built.',
)

assert.ok(
  receiptResolver.includes('AI 行动已完成') &&
    receiptResolver.includes('查看 AI 活动') &&
    receiptResolver.includes(`return "${receiptRecoveryKind}"`),
  'execution receipt resolver must identify player-facing receipt cards without raw ids.',
)

assert.ok(
  tokenResolver.includes(`"${receiptRecoveryKind}"`) &&
    tokenResolver.includes('source_refs.get("worldEventId", "")'),
  'execution receipt recovery should resolve only an internal world event token.',
)

assert.ok(
  receiptSmoke.includes(`_on_timeline_recovery_pressed(feedback_label, "${receiptRecoveryKind}"`) &&
    receiptSmoke.includes('"aiExecutionReceiptRecoveryToken"') &&
    receiptSmoke.includes('PLAYER_HISTORY_AI_EXECUTION_RECEIPT_RECOVERY_TOKEN'),
  'PlayerHistoryPanel must expose a lightweight smoke for AI execution receipt timeline recovery.',
)

assert.ok(
  surfaceResolver.includes(`"${receiptRecoveryKind}"`) &&
    surfaceResolver.includes('return "ai_hub"'),
  'main.gd recovery host must route AI execution receipt recovery to the AI panel.',
)

assert.ok(
  hostHandler.includes(`resolved_kind == "${receiptRecoveryKind}"`) &&
    hostHandler.includes(`_player_history_timeline_recovery_host_feedback = "${playerFeedback}"`) &&
    hostHandler.includes('player_history/timeline_recovery/%s'),
  'main.gd recovery host must provide execution-receipt player feedback and open the AI panel surface.',
)

assert.ok(
  surfaceOpen.includes('resolved_surface == "ai_hub"') &&
    surfaceOpen.includes('_open_overlay_panel("ai_hub")'),
  'execution receipt recovery must reuse the real AI panel surface.',
)

for (const forbidden of ['sourceRefs', 'worldEventId', 'proposalId', 'worldAction', 'JSON', 'backend', 'contract id', 'debug']) {
  assert.equal(playerFeedback.includes(forbidden), false, `execution receipt recovery feedback leaked engineering term: ${forbidden}`)
}

for (const [name, source] of [
  ['CURRENT handoff', handoff],
  ['product authority index', productIndex],
  ['AI governance authority', aiGovernance],
  ['producer radar', radar],
] as const) {
  assert.ok(source.includes('Stage 606'), `${name} must record Stage 606 AI execution receipt recovery`)
  assert.ok(source.includes(recoveryToken), `${name} must record the AI execution receipt recovery token`)
}

console.log('[godot_ai_execution_receipt_recovery_contract] all checks passed')
