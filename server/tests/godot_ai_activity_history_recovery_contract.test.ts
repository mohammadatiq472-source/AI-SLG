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

const recoveryToken = 'player_history_ai_activity_recovery_v1'
const playerFeedback = '已准备查看 AI 行动'

const sanitizer = functionSource(playerHistoryPanel, 'func _sanitize_timeline_card_for_visible_copy(card: Dictionary) -> Dictionary:')
const recoveryResolver = functionSource(playerHistoryPanel, 'func _resolve_timeline_recovery_action_kind(source_refs: Dictionary, category: String = "") -> String:')
const tokenResolver = functionSource(playerHistoryPanel, 'func _resolve_timeline_recovery_internal_token(recovery_kind: String, source_refs: Dictionary) -> String:')
const aiRecoverySmoke = functionSource(playerHistoryPanel, 'func run_ai_activity_timeline_recovery_smoke() -> Dictionary:')
const surfaceResolver = functionSource(mainSource, 'func _resolve_player_history_timeline_recovery_surface(recovery_kind: String) -> String:')
const feedbackResolver = functionSource(mainSource, 'func _resolve_player_history_timeline_recovery_feedback(target_surface: String) -> String:')
const surfaceOpen = functionSource(mainSource, 'func _open_player_history_timeline_recovery_surface(target_surface: String) -> void:')

assert.ok(
  playerHistoryPanel.includes(`PLAYER_HISTORY_AI_ACTIVITY_RECOVERY_TOKEN := "${recoveryToken}"`),
  'PlayerHistoryPanel must own a stable AI activity recovery token.',
)

assert.ok(
  sanitizer.includes('_resolve_timeline_recovery_action_kind(source_refs, str(card.get("category", "")).strip_edges())'),
  'timeline sanitizer must pass the card category into recovery resolution.',
)

assert.ok(
  recoveryResolver.includes('if category.strip_edges() == "ai_activity"') &&
    recoveryResolver.includes('return "ai_activity"'),
  'AI activity cards with internal source refs must resolve to a dedicated ai_activity recovery kind.',
)

assert.ok(
  tokenResolver.includes('"ai_activity"') &&
    tokenResolver.includes('source_refs.get("worldEventId", "")'),
  'AI activity recovery should resolve only an internal world event token, never visible raw ids.',
)

assert.ok(
  aiRecoverySmoke.includes('_on_timeline_recovery_pressed(feedback_label, "ai_activity"') &&
    aiRecoverySmoke.includes('"aiActivityHistoryRecoveryToken"') &&
    aiRecoverySmoke.includes('PLAYER_HISTORY_AI_ACTIVITY_RECOVERY_TOKEN'),
  'PlayerHistoryPanel must expose a lightweight smoke for AI activity timeline recovery.',
)

assert.ok(
  surfaceResolver.includes('"ai_activity"') &&
    surfaceResolver.includes('return "ai_hub"'),
  'main.gd recovery host must route AI activity recovery to the AI panel.',
)

assert.ok(
  feedbackResolver.includes(`return "${playerFeedback}"`),
  'AI activity recovery host feedback must be short player Chinese.',
)

assert.ok(
  surfaceOpen.includes('if resolved_surface == "ai_hub":') &&
    surfaceOpen.includes('_open_overlay_panel("ai_hub")') &&
    surfaceOpen.includes('ai_activity_opened_via_ai_hub'),
  'AI activity recovery must open the real AI panel surface through the host.',
)

for (const forbidden of ['read model', 'authority', 'tier', 'backend', 'contract id', 'fixture', 'debug', 'snake_case']) {
  assert.equal(playerFeedback.includes(forbidden), false, `AI activity recovery feedback leaked engineering term: ${forbidden}`)
}

for (const [name, source] of [
  ['CURRENT handoff', handoff],
  ['product authority index', productIndex],
  ['AI player governance authority', aiGovernance],
  ['player-history producer radar', radar],
] as const) {
  assert.ok(source.includes('Stage 586'), `${name} must record Stage 586 AI player history/progress recovery`)
  assert.ok(source.includes(recoveryToken), `${name} must record the AI activity recovery token`)
}

console.log('[godot_ai_activity_history_recovery_contract] all checks passed')
