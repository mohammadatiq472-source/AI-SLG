import { strict as assert } from 'assert';
import { readFileSync } from 'fs';

const unitViewLayerSource = readFileSync('godot-client/scripts/map/unit_view_layer.gd', 'utf-8');
const aiMapIntentMarkerSource = readFileSync('godot-client/scripts/map/ai_map_intent_marker.gd', 'utf-8');
const mainSource = readFileSync('godot-client/scripts/app/main.gd', 'utf-8');
const visualSmokeSource = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8');
const closureBatchSource = readFileSync('godot-client/tools/run_mainline_ui_closure_batch.py', 'utf-8');

const collectIntentStart = unitViewLayerSource.indexOf('func _collect_ai_intent_markers(');
const collectIntentEnd = unitViewLayerSource.indexOf('\nfunc ', collectIntentStart + 1);
const collectIntentSource =
  collectIntentStart >= 0 && collectIntentEnd > collectIntentStart
    ? unitViewLayerSource.slice(collectIntentStart, collectIntentEnd)
    : '';
const summaryStart = unitViewLayerSource.indexOf('func get_visual_acceptance_summary()');
const summaryEnd = unitViewLayerSource.indexOf('\nfunc ', summaryStart + 1);
const summarySource =
  summaryStart >= 0 && summaryEnd > summaryStart
    ? unitViewLayerSource.slice(summaryStart, summaryEnd)
    : '';

assert.ok(
  unitViewLayerSource.includes('const AI_LIVING_ACTIVITY_LAYER_CONTRACT := "ai_living_activity_layer_v1"'),
  'UnitViewLayer must expose ai_living_activity_layer_v1.'
);
assert.ok(
  collectIntentSource.includes('playerRuntimeExecutionTraceItems'),
  'Main-world AI activity markers must read playerRuntimeExecutionTraceItems.'
);
assert.ok(
  collectIntentSource.includes('_collect_ai_living_activity_markers_from_execution_trace'),
  'Main-world AI activity markers must collect execution-trace markers before proposal fallback.'
);
assert.ok(
  collectIntentSource.indexOf('playerRuntimeExecutionTraceItems') >= 0
    && collectIntentSource.indexOf('playerRuntimeProposalItems') >= 0
    && collectIntentSource.indexOf('playerRuntimeExecutionTraceItems') < collectIntentSource.indexOf('playerRuntimeProposalItems'),
  'Main-world AI activity markers must prefer execution trace before legacy proposal markers.'
);
assert.ok(
  summarySource.includes('aiLivingActivityLayerContract')
    && summarySource.includes('aiLivingActivityMarkerCount')
    && summarySource.includes('aiLivingActivityUsesExecutionTrace')
    && summarySource.includes('aiLivingActivityFallbackUsed')
    && summarySource.includes('aiLivingActivityMarkerViewportClampedCount'),
  'UnitViewLayer summary must expose living activity debug fields.'
);
assert.ok(
  aiMapIntentMarkerSource.includes('KIND_LIVING_ACTIVITY') || aiMapIntentMarkerSource.includes('"living_activity"'),
  'AIMapIntentMarker must support a distinct living-activity marker kind.'
);

assert.ok(
  mainSource.includes('"world_ai_living_activity_layer_fixture"'),
  'main.gd must route the world_ai_living_activity_layer_fixture click action.'
);
assert.ok(
  mainSource.includes('func _press_mainline_visual_smoke_world_ai_living_activity_layer_fixture('),
  'main.gd must implement a main-world AI living activity fixture action.'
);
assert.ok(
  mainSource.includes('"aiLivingActivityUsesExecutionTrace": bool(map_unit_summary.get("aiLivingActivityUsesExecutionTrace", false))'),
  'The fixture result must return aiLivingActivityUsesExecutionTrace for screenshot gate validation.'
);
assert.ok(
  mainSource.includes('aiLivingActivityMarkerViewportClampedCount'),
  'The fixture result must return aiLivingActivityMarkerViewportClampedCount so offscreen activity still has visible proof.'
);

assert.ok(
  visualSmokeSource.includes('"world_ai_living_activity_layer_fixture"'),
  'run_mainline_visual_smoke.py must allow world_ai_living_activity_layer_fixture.'
);
assert.ok(
  /"world_ai_living_activity_layer_fixture":\s*\{\s*"display_mode":\s*"world"/s.test(visualSmokeSource),
  'world_ai_living_activity_layer_fixture must open the main world through the formal visual smoke entry.'
);
assert.ok(
  closureBatchSource.includes('AI_LIVING_ACTIVITY_LAYER_ACTIONS')
    && closureBatchSource.includes('"world_ai_living_activity_layer_fixture"'),
  'closure batch must include world_ai_living_activity_layer_fixture for formal closure validation.'
);

console.log('godot_main_world_ai_living_activity_layer_contract: ok');
