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

const recoveryToken = 'player_history_ai_proposal_apply_recovery_v1'
const proposalRecoveryKind = 'ai_proposal_apply'
const playerFeedback = '已准备处理 AI 提案'

const sanitizer = functionSource(playerHistoryPanel, 'func _sanitize_timeline_card_for_visible_copy(card: Dictionary) -> Dictionary:')
const proposalResolver = functionSource(playerHistoryPanel, 'func _resolve_ai_proposal_apply_recovery_kind(visible_payload: Dictionary) -> String:')
const tokenResolver = functionSource(playerHistoryPanel, 'func _resolve_timeline_recovery_internal_token(recovery_kind: String, source_refs: Dictionary) -> String:')
const proposalSmoke = functionSource(playerHistoryPanel, 'func run_ai_proposal_apply_timeline_recovery_smoke() -> Dictionary:')
const hostHandler = functionSource(mainSource, 'func _on_player_history_timeline_recovery_requested(recovery_kind: String) -> void:')
const surfaceResolver = functionSource(mainSource, 'func _resolve_player_history_timeline_recovery_surface(recovery_kind: String) -> String:')
const surfaceOpen = functionSource(mainSource, 'func _open_player_history_timeline_recovery_surface(target_surface: String) -> void:')

assert.ok(
  packetContract.includes("playerHistoryTitle: 'AI 提案需要确认'") &&
    packetContract.includes("playerHistoryNextAction: '处理提案'") &&
    packetContract.includes("outcomeState: 'approval_required_or_denied'"),
  'existing player-history packet contract must already define the AI proposal/approval-required card lane.',
)

assert.ok(
  playerHistoryPanel.includes(`PLAYER_HISTORY_AI_PROPOSAL_APPLY_RECOVERY_TOKEN := "${recoveryToken}"`),
  'PlayerHistoryPanel must own a stable AI proposal/apply recovery token.',
)

assert.ok(
  sanitizer.includes('_resolve_ai_proposal_apply_recovery_kind(visible_payload)') &&
    sanitizer.includes('visible_payload["recoveryActionKind"] = recovery_kind'),
  'timeline sanitizer must upgrade proposal/apply AI cards to a dedicated recovery kind after visible copy is built.',
)

assert.ok(
  proposalResolver.includes('nextActionLabel') &&
    proposalResolver.includes('处理提案') &&
    proposalResolver.includes('AI 提案') &&
    proposalResolver.includes(`return "${proposalRecoveryKind}"`),
  'proposal/apply resolver must identify the player-facing proposal card without using raw ids.',
)

assert.ok(
  tokenResolver.includes(`"${proposalRecoveryKind}"`) &&
    tokenResolver.includes('source_refs.get("worldEventId", "")'),
  'proposal/apply recovery should resolve only an internal world event token.',
)

assert.ok(
  proposalSmoke.includes(`_on_timeline_recovery_pressed(feedback_label, "${proposalRecoveryKind}"`) &&
    proposalSmoke.includes('"aiProposalApplyRecoveryToken"') &&
    proposalSmoke.includes('PLAYER_HISTORY_AI_PROPOSAL_APPLY_RECOVERY_TOKEN'),
  'PlayerHistoryPanel must expose a lightweight smoke for AI proposal/apply timeline recovery.',
)

assert.ok(
  surfaceResolver.includes(`"${proposalRecoveryKind}"`) &&
    surfaceResolver.includes('return "ai_hub"'),
  'main.gd recovery host must route AI proposal/apply recovery to the AI panel.',
)

assert.ok(
  hostHandler.includes(`if resolved_kind == "${proposalRecoveryKind}":`) &&
    hostHandler.includes(`_player_history_timeline_recovery_host_feedback = "${playerFeedback}"`) &&
    hostHandler.includes('target_surface == "ai_hub"'),
  'main.gd recovery host must provide proposal-specific player feedback and open the AI panel surface.',
)

assert.ok(
  surfaceOpen.includes('if resolved_surface == "ai_hub":') &&
    surfaceOpen.includes('_open_overlay_panel("ai_hub")'),
  'proposal/apply recovery must reuse the real AI panel surface.',
)

for (const forbidden of ['read model', 'authority', 'tier', 'backend', 'contract id', 'fixture', 'debug', 'snake_case']) {
  assert.equal(playerFeedback.includes(forbidden), false, `proposal/apply recovery feedback leaked engineering term: ${forbidden}`)
}

for (const [name, source] of [
  ['CURRENT handoff', handoff],
  ['product authority index', productIndex],
  ['AI player governance authority', aiGovernance],
  ['player-history producer radar', radar],
] as const) {
  assert.ok(source.includes('Stage 591'), `${name} must record Stage 591 AI proposal/apply result recovery`)
  assert.ok(source.includes(recoveryToken), `${name} must record the AI proposal/apply recovery token`)
}

console.log('[godot_ai_proposal_apply_recovery_contract] all checks passed')
