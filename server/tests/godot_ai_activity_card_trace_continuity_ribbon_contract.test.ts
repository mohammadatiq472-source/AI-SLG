import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const mainSource = readFileSync('godot-client/scripts/app/main.gd', 'utf8');
const factorySource = readFileSync('godot-client/scripts/ui/slg_ui_component_factory.gd', 'utf8');
const closureBatchSource = readFileSync('godot-client/tools/run_mainline_ui_closure_batch.py', 'utf8');

const ribbonToken = 'ai_activity_card_trace_continuity_ribbon_v1';

function sliceFunction(source: string, signature: string): string {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `Missing function: ${signature}`);
  const next = source.indexOf('\nfunc ', start + signature.length);
  return source.slice(start, next === -1 ? source.length : next);
}

const ensureCardSource = sliceFunction(mainSource, 'func _ensure_ai_activity_card() -> void:');
const payloadSource = sliceFunction(mainSource, 'func _build_ai_activity_card_payload_from_trace(trace_items: Array, open_source: String) -> Dictionary:');
const openCardSource = sliceFunction(mainSource, 'func _open_ai_activity_card_from_execution_trace(open_source: String) -> Dictionary:');
const summarySource = sliceFunction(mainSource, 'func _read_mainline_visual_smoke_ai_activity_card_summary() -> Dictionary:');

assert(
  factorySource.includes(`const AI_ACTIVITY_CARD_TRACE_CONTINUITY_RIBBON_TOKEN := "${ribbonToken}"`) &&
    factorySource.includes('static func ai_activity_card_trace_continuity_ribbon_token() -> String:'),
  'component factory must expose the AI activity card trace continuity ribbon token.',
);

assert(
  mainSource.includes('var _ai_activity_card_trace_continuity_ribbon: PanelContainer') &&
    mainSource.includes('var _ai_activity_card_trace_continuity_label: Label') &&
    mainSource.includes('var _ai_activity_card_trace_continuity_trace_id: String = ""'),
  'main.gd must keep stable nodes/state for the trace continuity ribbon.',
);

assert(
  ensureCardSource.includes('AIActivityCardTraceContinuityRibbon') &&
    ensureCardSource.includes('AIActivityCardTraceContinuityLabel') &&
    ensureCardSource.includes('ai_activity_card_trace_continuity_ribbon_token'),
  'AI activity card must create a visible trace continuity ribbon node with the contract token.',
);

assert(
  payloadSource.includes('"traceId": str(trace_item.get("traceId", "")).strip_edges()') &&
    payloadSource.includes('"traceContinuityText"') &&
    payloadSource.includes('open_source'),
  'AI activity card payload must carry trace id and player-facing continuity copy.',
);

assert(
  openCardSource.includes('_ai_activity_card_trace_continuity_trace_id = str(payload.get("traceId", "")).strip_edges()') &&
    openCardSource.includes('_ai_activity_card_trace_continuity_ribbon.set_meta("ai_activity_card_trace_continuity_ribbon_token"') &&
    openCardSource.includes('_ai_activity_card_trace_continuity_label.text = str(payload.get("traceContinuityText", "")).strip_edges()'),
  'opening the AI activity card must bind trace id/copy onto the ribbon node.',
);

assert(
  summarySource.includes('"aiActivityCardTraceContinuityRibbonToken"') &&
    summarySource.includes('"aiActivityCardTraceContinuityRibbonVisible"') &&
    summarySource.includes('"aiActivityCardTraceContinuityTraceId"') &&
    summarySource.includes('"aiActivityCardTraceContinuityText"'),
  'AI activity card summary must expose trace continuity ribbon proof fields.',
);

assert(
  closureBatchSource.includes('AI_ACTIVITY_CARD_TRACE_CONTINUITY_RIBBON_TOKEN = "ai_activity_card_trace_continuity_ribbon_v1"') &&
    closureBatchSource.includes('aiActivityCardTraceContinuityRibbonToken!=ai_activity_card_trace_continuity_ribbon_v1') &&
    closureBatchSource.includes('aiActivityCardTraceContinuityRibbonVisible!=true') &&
    closureBatchSource.includes('aiActivityCardTraceContinuityTraceId=empty'),
  'closure batch must reject missing trace continuity ribbon proof on AI activity card fixtures.',
);

console.log('[godot_ai_activity_card_trace_continuity_ribbon_contract] all checks passed');
