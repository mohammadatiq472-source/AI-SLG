import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mainSource = readFileSync('godot-client/scripts/app/main.gd', 'utf8')
const handoff = readFileSync('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md', 'utf8')
const productIndex = readFileSync('docs/PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md', 'utf8')
const aiGovernance = readFileSync('docs/PRODUCT_AUTHORITY_AI_PLAYER_GOVERNANCE_CURRENT_2026_06_10.md', 'utf8')
const radar = readFileSync('docs/PLAYER_HISTORY_PRODUCER_COVERAGE_RADAR_CURRENT_2026_06_13.md', 'utf8')

const failureToken = 'ai_switch_live_refresh_failure_feedback_v1'
const playerCopy = 'AI主城暂时打不开，请先在AI面板刷新或选择主城。'

assert.ok(
  mainSource.includes(`AI_SWITCH_LIVE_REFRESH_FAILURE_FEEDBACK_TOKEN := "${failureToken}"`),
  'main.gd must own a stable AI switch live-refresh failure feedback token.',
)

assert.ok(
  mainSource.includes('func _open_ai_switch_fallback_panel(reason: String = "fallback") -> void:') &&
    mainSource.includes('_active_overlay_panel.set_meta("ai_switch_live_refresh_failure_feedback_token", AI_SWITCH_LIVE_REFRESH_FAILURE_FEEDBACK_TOKEN)') &&
    mainSource.includes('_active_overlay_panel.set_meta("ai_switch_live_refresh_failure_reason", normalized_reason)'),
  'AI switch fallback must attach stable failure metadata to the opened AI panel.',
)

assert.ok(
  mainSource.includes(`const AI_SWITCH_LIVE_REFRESH_FAILURE_PLAYER_COPY := "${playerCopy}"`) &&
    mainSource.includes('_update_runtime_label(AI_SWITCH_LIVE_REFRESH_FAILURE_PLAYER_COPY)') &&
    mainSource.includes('_record_last_action("shell/ai_switch/fallback/%s" % normalized_reason, "needs_player_attention")'),
  'AI switch fallback must record short player-facing Chinese feedback instead of silently opening the panel.',
)

assert.ok(
  mainSource.includes('_open_ai_switch_fallback_panel("runtime_refresh_failed")') &&
    mainSource.includes('_open_ai_switch_fallback_panel("home_city_open_failed")') &&
    mainSource.includes('_open_ai_switch_fallback_panel("adapter_unavailable")'),
  'AI switch one-click flow must distinguish refresh, open, and adapter fallback reasons.',
)

for (const forbidden of ['read model', 'authority', 'tier', 'backend', 'contract id', 'fixture', 'debug', 'snake_case']) {
  assert.equal(playerCopy.includes(forbidden), false, `AI switch failure copy leaked engineering term: ${forbidden}`)
}

for (const [name, source] of [
  ['CURRENT handoff', handoff],
  ['product authority index', productIndex],
  ['AI player governance authority', aiGovernance],
  ['player-history producer radar', radar],
] as const) {
  assert.ok(source.includes('Stage 581'), `${name} must record Stage 581 AI switch live-refresh failure feedback`)
  assert.ok(source.includes(failureToken), `${name} must record the AI switch failure feedback token`)
}

console.log('[godot_ai_switch_live_refresh_failure_feedback_contract] all checks passed')
