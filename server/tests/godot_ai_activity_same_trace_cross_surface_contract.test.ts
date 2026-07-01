import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const factorySource = readSource('godot-client/scripts/ui/slg_ui_component_factory.gd');
const aiPanelPresenterSource = readSource('godot-client/scripts/ui/presenters/ai_panel_presenter.gd');
const aiPanelSource = readSource('godot-client/scripts/ui/ai_panel.gd');
const unitViewLayerSource = readSource('godot-client/scripts/map/unit_view_layer.gd');
const battleReportPresenterSource = readSource('godot-client/scripts/ui/presenters/battle_report_presenter.gd');
const battleReportDetailSource = readSource('godot-client/scripts/ui/battle_report_detail_page.gd');
const chatSource = readSource('godot-client/scripts/ui/main_chat_overlay.gd');
const mainSource = readSource('godot-client/scripts/app/main.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const sliceFunction = (source: string, signature: string) => {
  const start = source.indexOf(signature);
  const end = source.indexOf('\nfunc ', start + 1);
  return start >= 0 && end > start ? source.slice(start, end) : '';
};

const aiPanelSharedStateStart = aiPanelPresenterSource.indexOf('"shared_state": {');
const aiPanelSharedStateEnd = aiPanelPresenterSource.indexOf('\n\t\t},', aiPanelSharedStateStart + 1);
const aiPanelSharedStateSource =
  aiPanelSharedStateStart >= 0 && aiPanelSharedStateEnd > aiPanelSharedStateStart
    ? aiPanelPresenterSource.slice(aiPanelSharedStateStart, aiPanelSharedStateEnd)
    : '';
const aiPanelSummarySource = sliceFunction(aiPanelSource, 'func get_mainline_visual_smoke_summary(page_id: String = "") -> Dictionary:');
const unitSummarySource = sliceFunction(unitViewLayerSource, 'func get_visual_acceptance_summary()');
const battleActivityResolverSource = sliceFunction(
  battleReportPresenterSource,
  'func _resolve_battle_report_ai_activity_continuity(',
);
const battleIdentityRowSource = sliceFunction(
  battleReportDetailSource,
  'func _build_ai_living_identity_row(',
);
const battleDetailSummarySource = sliceFunction(
  battleReportDetailSource,
  'func get_mainline_visual_smoke_detail_summary()',
);
const chatResolverSource = sliceFunction(chatSource, 'func _resolve_chat_ai_activity_continuity(');
const chatSummarySource = sliceFunction(chatSource, 'func get_chat_message_visual_smoke_summary()');
const sameTraceActionSource = sliceFunction(
  mainSource,
  'func _press_mainline_visual_smoke_ai_activity_same_trace_cross_surface_fixture() -> Dictionary:',
);

assert.ok(
  factorySource.includes(
    'const AI_ACTIVITY_SAME_TRACE_CROSS_SURFACE_TOKEN := "ai_activity_same_trace_cross_surface_v1"',
  ) &&
    factorySource.includes('static func ai_activity_same_trace_cross_surface_token() -> String:'),
  'factory must expose a stable same-trace cross-surface token.',
);

assert.ok(
  aiPanelPresenterSource.includes('func _resolve_first_ai_execution_trace_id(') &&
    aiPanelSharedStateSource.includes('"ai_execution_trace_first_trace_id"'),
  'AI panel presenter shared state must expose the first execution trace id.',
);
assert.ok(
  aiPanelSummarySource.includes('"aiPanelExecutionTraceFirstTraceId"'),
  'AI panel visual summary must expose aiPanelExecutionTraceFirstTraceId.',
);

assert.ok(
  unitSummarySource.includes('"aiLivingActivityFirstTraceId"') &&
    unitSummarySource.includes('_resolve_first_ai_living_activity_marker_trace_id()'),
  'main-world living activity summary must expose the first marker trace id.',
);

assert.ok(
  battleActivityResolverSource.includes('"execution_trace_ids"') &&
    battleActivityResolverSource.includes('traceId'),
  'battle report presenter must attach execution trace ids to the AI activity continuity payload.',
);
assert.ok(
  battleIdentityRowSource.includes('battle_report_detail_ai_activity_trace_id') &&
    battleIdentityRowSource.includes('execution_trace_ids'),
  'battle report detail identity row must store trace ids in node meta for summary proof.',
);
assert.ok(
  battleDetailSummarySource.includes('"battleReportDetailAiActivityFirstTraceId"') &&
    battleDetailSummarySource.includes('"battleReportDetailAiActivityTraceIds"'),
  'battle report detail summary must expose trace id proof fields.',
);

assert.ok(
  chatResolverSource.includes('"first_trace_id"') &&
    chatResolverSource.includes('traceId'),
  'chat activity continuity resolver must carry the selected execution trace id.',
);
assert.ok(
  chatSummarySource.includes('"chatAiActivityFirstTraceId"'),
  'chat visual summary must expose chatAiActivityFirstTraceId.',
);

assert.ok(
  mainSource.includes('"ai_activity_same_trace_cross_surface_fixture"') &&
    sameTraceActionSource.includes('aiActivitySameTraceCrossSurfaceToken') &&
    sameTraceActionSource.includes('aiActivitySameTraceId') &&
    sameTraceActionSource.includes('aiActivitySameTraceAiPanelTraceId') &&
    sameTraceActionSource.includes('aiActivitySameTraceMainWorldTraceId') &&
    sameTraceActionSource.includes('aiActivitySameTraceBattleReportTraceId') &&
    sameTraceActionSource.includes('aiActivitySameTraceTianxiaTraceId') &&
    sameTraceActionSource.includes('aiActivitySameTraceChatTraceId'),
  'main.gd must implement a formal same-trace cross-surface visual-smoke fixture action.',
);

assert.ok(
  visualSmokeSource.includes('"ai_activity_same_trace_cross_surface_fixture"') &&
    visualSmokeSource.includes('"aiActivitySameTraceCrossSurfaceToken"') &&
    visualSmokeSource.includes('"aiActivitySameTraceCrossSurfaceOk"') &&
    visualSmokeSource.includes('"aiActivitySameTraceId"') &&
    visualSmokeSource.includes('"aiActivitySameTraceAiPanelTraceId"') &&
    visualSmokeSource.includes('"aiActivitySameTraceMainWorldTraceId"') &&
    visualSmokeSource.includes('"aiActivitySameTraceBattleReportTraceId"') &&
    visualSmokeSource.includes('"aiActivitySameTraceTianxiaTraceId"') &&
    visualSmokeSource.includes('"aiActivitySameTraceChatTraceId"'),
  'run_mainline_visual_smoke.py must expose and require the same-trace cross-surface fields.',
);

assert.ok(
  closureBatchSource.includes('AI_ACTIVITY_SAME_TRACE_CROSS_SURFACE_TOKEN = "ai_activity_same_trace_cross_surface_v1"') &&
    closureBatchSource.includes('aiActivitySameTraceCrossSurfaceToken!=ai_activity_same_trace_cross_surface_v1') &&
    closureBatchSource.includes('aiActivitySameTraceCrossSurfaceOk!=true') &&
    closureBatchSource.includes('aiActivitySameTraceSurfaceCount<5') &&
    closureBatchSource.includes('"aiActivitySameTraceTianxiaTraceId"') &&
    closureBatchSource.includes('aiActivitySameTraceMismatch'),
  'closure batch must reject screenshots where the same trace id is not proven across all five surfaces.',
);

console.log('[godot_ai_activity_same_trace_cross_surface_contract] all checks passed');
