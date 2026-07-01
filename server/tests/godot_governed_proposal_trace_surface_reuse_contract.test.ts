import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')

function functionSource(source: string, signature: string) {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const end = source.indexOf('\nfunc ', start + 1)
  return source.slice(start, end > start ? end : source.length)
}

const mainSource = readSource('godot-client/scripts/app/main.gd')
const aiPanelPresenterSource = readSource('godot-client/scripts/ui/presenters/ai_panel_presenter.gd')
const unitViewLayerSource = readSource('godot-client/scripts/map/unit_view_layer.gd')

const baseTraceBuilder = functionSource(mainSource, 'func _build_mainline_visual_smoke_ai_execution_trace_items(ai_player_id: String) -> Array:')
const worldTraceBuilder = functionSource(mainSource, 'func _build_mainline_visual_smoke_world_ai_living_activity_trace_items(ai_player_id: String) -> Array:')
const aiPanelFixture = functionSource(mainSource, 'func _press_mainline_visual_smoke_ai_panel_execution_trace_fixture(panel_id: String) -> Dictionary:')
const shellFixture = functionSource(mainSource, 'func _press_mainline_visual_smoke_world_shell_ai_activity_badge_fixture() -> Dictionary:')
const aiPanelSourceFormatter = functionSource(aiPanelPresenterSource, 'func _format_ai_execution_trace_source(source_kind: String) -> String:')
const markerCollector = functionSource(unitViewLayerSource, 'func _collect_ai_living_activity_markers_from_execution_trace(trace_items: Array, markers: Dictionary) -> int:')

assert.ok(
  baseTraceBuilder.includes('"sourceKind": "governed_proposal"') &&
    baseTraceBuilder.includes('"action": "maritime_patrol_intercept"') &&
    baseTraceBuilder.includes('trace_visual_smoke_governed_maritime_intercept'),
  'formal trace fixture builder must seed a governed_proposal maritime intercept item.',
)

assert.ok(
  aiPanelSourceFormatter.includes('"governed_proposal"'),
  'AI panel execution-trace source formatter must expose governed_proposal as a first-class source.',
)

assert.ok(
  aiPanelFixture.includes('_build_mainline_visual_smoke_ai_execution_trace_items(ai_player_id)') &&
    aiPanelFixture.includes('aiPanelExecutionTraceGovernedProposalVisible'),
  'AI panel execution-trace fixture must prove governed_proposal reaches existing trace cards.',
)

assert.ok(
  worldTraceBuilder.includes('trace_items[1]') &&
    worldTraceBuilder.includes('governed_proposal'),
  'main-world living activity trace builder must preserve the governed proposal item for existing markers.',
)

assert.ok(
  markerCollector.includes('sourceKind') &&
    markerCollector.includes('governed_proposal'),
  'UnitViewLayer marker collector must carry governed_proposal source metadata through existing markers.',
)

assert.ok(
  shellFixture.includes('worldShellAiActivityBadgeGovernedProposalVisible'),
  'shell AI activity badge fixture must prove governed_proposal reaches the existing shell badge trace source.',
)

console.log('[godot_governed_proposal_trace_surface_reuse_contract] all checks passed')
