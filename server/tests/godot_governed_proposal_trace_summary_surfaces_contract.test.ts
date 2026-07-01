import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')

const functionSource = (source: string, signature: string): string => {
  const start = source.indexOf(signature)
  if (start < 0) {
    return ''
  }
  const end = source.indexOf('\nfunc ', start + signature.length)
  return source.slice(start, end > start ? end : source.length)
}

const mainSource = readSource('godot-client/scripts/app/main.gd')
const chatSource = readSource('godot-client/scripts/ui/main_chat_overlay.gd')

const sameTraceSeedSource = functionSource(
  mainSource,
  'func _seed_mainline_visual_smoke_same_trace_cross_surface_fixture(ai_player_id: String) -> Dictionary:',
)
const chatFixtureSeedSource = functionSource(
  mainSource,
  'func _seed_mainline_visual_smoke_chat_ai_activity_continuity_fixture(ai_player_id: String) -> void:',
)
const playerReportBuilderSource = functionSource(
  mainSource,
  'func _build_mainline_visual_smoke_same_trace_player_report_items(ai_player_id: String, trace_id: String) -> Array:',
)
const tianxiaTraceBuilderSource = functionSource(
  mainSource,
  'func _build_mainline_visual_smoke_tianxia_yutu_living_world_trace_items(ai_player_id: String, primary_trace_id: String = "") -> Array:',
)
const sameTraceActionSource = functionSource(
  mainSource,
  'func _press_mainline_visual_smoke_ai_activity_same_trace_cross_surface_fixture() -> Dictionary:',
)
const currentGoalsActionSource = functionSource(
  mainSource,
  'func _press_mainline_visual_smoke_current_goals_nation_midgame_entry() -> Dictionary:',
)
const chatFormatterSource = functionSource(
  chatSource,
  'func _format_chat_ai_activity_display_copy(value: String) -> String:',
)
const chatSummarySource = functionSource(
  chatSource,
  'func get_chat_message_visual_smoke_summary()',
)

assert.ok(
  sameTraceSeedSource.includes('_build_mainline_visual_smoke_world_ai_living_activity_trace_items(ai_player_id)') &&
    sameTraceSeedSource.includes('governed_proposal') &&
    sameTraceSeedSource.includes('maritime_patrol_intercept'),
  'same-trace seed must reuse the existing governed maritime trace instead of a new autonomous fixture.',
)

assert.ok(
  chatFixtureSeedSource.includes('_seed_mainline_visual_smoke_same_trace_cross_surface_fixture(ai_player_id)'),
  'chat continuity fixture must reuse the same governed trace seed used by other trace surfaces.',
)

assert.ok(
  playerReportBuilderSource.includes('"sourceKind": "governed_proposal"') &&
    playerReportBuilderSource.includes('"action": "maritime_patrol_intercept"') &&
    playerReportBuilderSource.includes('"itemKind": "ai_autonomous_combat"'),
  'battle/chat continuity report payload must carry the governed maritime trace while reusing the existing report surface.',
)

assert.ok(
  tianxiaTraceBuilderSource.includes('trace_items[1]') &&
    tianxiaTraceBuilderSource.includes('governed_proposal') &&
    tianxiaTraceBuilderSource.includes('maritime_patrol_intercept'),
  'Tianxia trace builder must preserve the governed maritime trace item when building existing hotspots.',
)

assert.ok(
  chatFormatterSource.includes('maritime_patrol_intercept'),
  'chat trace summary formatter must provide player-readable copy for maritime_patrol_intercept without leaking raw action ids.',
)
assert.ok(
  chatSummarySource.includes('"chatAiActivityGovernedProposalVisible"'),
  'chat visual smoke summary must expose governed proposal visibility for the existing continuity strip.',
)

assert.ok(
  sameTraceActionSource.includes('aiActivitySameTraceGovernedProposalVisible') &&
    sameTraceActionSource.includes('currentGoalsTraceSummary'),
  'same-trace fixture must prove governed trace visibility and carry the current-goals trace summary.',
)

assert.ok(
  currentGoalsActionSource.includes('_seed_mainline_visual_smoke_same_trace_cross_surface_fixture(') &&
    currentGoalsActionSource.includes('"currentGoalsGovernedProposalTraceVisible"') &&
    currentGoalsActionSource.includes('"currentGoalsTraceSummary"'),
  'current-goals formal action must expose a read-only governed trace summary from the existing trace feed.',
)

console.log('[godot_governed_proposal_trace_summary_surfaces_contract] all checks passed')
