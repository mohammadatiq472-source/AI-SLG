import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const sliceFunction = (source: string, signature: string): string => {
  const start = source.indexOf(signature);
  if (start < 0) {
    return '';
  }
  const end = source.indexOf('\nfunc ', start + signature.length);
  return source.slice(start, end > start ? end : source.length);
};

const presenterSource = readSource('godot-client/scripts/ui/presenters/ai_panel_presenter.gd');
const snapshotSectionSource = readSource('godot-client/scripts/ui/slg_snapshot_section_page.gd');
const aiPanelSource = readSource('godot-client/scripts/ui/ai_panel.gd');
const mainSource = readSource('godot-client/scripts/app/main.gd');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const traceCardChromeToken = 'ai_panel_execution_trace_card_chrome_v1';
const presenterTraceCardsSource = sliceFunction(
  presenterSource,
  'func _build_ai_execution_trace_cards(execution_trace_items: Array) -> Array:',
);
const snapshotStateCardSource = sliceFunction(
  snapshotSectionSource,
  'func _build_state_card(shared_state: Dictionary, raw_card: Variant) -> Control:',
);
const aiPanelSummarySource = sliceFunction(
  aiPanelSource,
  'func get_mainline_visual_smoke_summary(page_id: String = "") -> Dictionary:',
);
const fixtureSource = sliceFunction(
  mainSource,
  'func _press_mainline_visual_smoke_ai_panel_execution_trace_fixture(panel_id: String) -> Dictionary:',
);

assert.ok(
  presenterSource.includes(`const AI_PANEL_EXECUTION_TRACE_CARD_CHROME_TOKEN := "${traceCardChromeToken}"`) &&
    presenterTraceCardsSource.includes('"ai_execution_trace_card_chrome_token": AI_PANEL_EXECUTION_TRACE_CARD_CHROME_TOKEN') &&
    presenterTraceCardsSource.includes('"ai_execution_trace_phase": phase') &&
    presenterTraceCardsSource.includes('"ai_execution_trace_stagger_index": trace_card_index'),
  'AIPanelPresenter must tag execution-trace cards with a stable chrome token, phase, and stagger index.',
);

assert.ok(
  snapshotStateCardSource.includes('"ai_execution_trace_card_chrome_token"') &&
    snapshotStateCardSource.includes('set_meta("ai_execution_trace_card_chrome_token"') &&
    snapshotStateCardSource.includes('set_meta("ai_execution_trace_phase"') &&
    snapshotStateCardSource.includes('set_meta("ai_execution_trace_stagger_index"'),
  'Snapshot state cards must render execution-trace card chrome metadata on visible card shells.',
);

assert.ok(
  aiPanelSummarySource.includes('aiPanelExecutionTraceCardChromeToken') &&
    aiPanelSummarySource.includes('_ai_visual_smoke_count_visible_meta("ai_execution_trace_card_chrome_token"') &&
    aiPanelSummarySource.includes('aiPanelExecutionTraceCardMotionMode') &&
    aiPanelSummarySource.includes('aiPanelExecutionTraceCardStaggeredCount'),
  'AI panel visual-smoke summary must expose execution-trace card chrome and stagger motion fields.',
);

assert.ok(
  fixtureSource.includes('"aiPanelExecutionTraceCardChromeToken": str(summary.get("aiPanelExecutionTraceCardChromeToken", "")).strip_edges()') &&
    fixtureSource.includes('"aiPanelExecutionTraceCardChromeCount": int(summary.get("aiPanelExecutionTraceCardChromeCount", 0))') &&
    fixtureSource.includes('"aiPanelExecutionTraceCardMotionMode": str(summary.get("aiPanelExecutionTraceCardMotionMode", "")).strip_edges()'),
  'ai_panel_execution_trace_fixture must return execution-trace card chrome proof fields.',
);

assert.ok(
  closureBatchSource.includes('aiPanelExecutionTraceCardChromeToken!=ai_panel_execution_trace_card_chrome_v1') &&
    closureBatchSource.includes('aiPanelExecutionTraceCardChromeCount<2') &&
    closureBatchSource.includes('aiPanelExecutionTraceCardMotionMode!=phase_chip_stagger_v1'),
  'closure batch must validate execution-trace card chrome count and motion mode.',
);

console.log('[godot_ai_panel_execution_trace_card_chrome_contract] all checks passed');
