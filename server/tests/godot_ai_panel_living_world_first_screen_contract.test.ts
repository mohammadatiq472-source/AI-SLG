import { strict as assert } from 'assert';
import { readFileSync } from 'fs';

const presenterSource = readFileSync('godot-client/scripts/ui/presenters/ai_panel_presenter.gd', 'utf-8');
const aiPanelSource = readFileSync('godot-client/scripts/ui/ai_panel.gd', 'utf-8');
const mainSource = readFileSync('godot-client/scripts/app/main.gd', 'utf-8');
const visualSmokeSource = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8');
const closureBatchSource = readFileSync('godot-client/tools/run_mainline_ui_closure_batch.py', 'utf-8');

const firstScreenStart = presenterSource.indexOf('func _build_ai_players_first_screen_blocks(');
const firstScreenEnd = presenterSource.indexOf('\nfunc ', firstScreenStart + 1);
const firstScreenSource =
  firstScreenStart >= 0 && firstScreenEnd > firstScreenStart
    ? presenterSource.slice(firstScreenStart, firstScreenEnd)
    : '';
const actionResultStart = closureBatchSource.indexOf('def _validate_action_result_contract(');
const actionResultEnd = closureBatchSource.indexOf('\ndef ', actionResultStart + 1);
const actionResultSource =
  actionResultStart >= 0 && actionResultEnd > actionResultStart
    ? closureBatchSource.slice(actionResultStart, actionResultEnd)
    : '';

assert.ok(
  presenterSource.includes('const AI_PLAYER_LIVING_WORLD_FIRST_SCREEN_CONTRACT := "ai_player_living_world_first_screen_v1"'),
  'AIPanelPresenter must expose a stable AI-player living-world first-screen contract token.'
);
assert.ok(
  presenterSource.includes('"ai_player_living_world_first_screen_contract": AI_PLAYER_LIVING_WORLD_FIRST_SCREEN_CONTRACT'),
  'AIPanelPresenter shared_state must expose the living-world first-screen contract.'
);
assert.ok(
  presenterSource.includes('"ai_execution_trace_visible": not ai_player_execution_trace_items.is_empty()'),
  'AIPanelPresenter shared_state must report whether execution trace is visible.'
);
assert.ok(
  firstScreenSource.includes('AIPlayerExecutionTraceBlock'),
  'AI players first screen must render AIPlayerExecutionTraceBlock.'
);
assert.ok(
  firstScreenSource.indexOf('AIPlayerExecutionTraceBlock') >= 0
    && firstScreenSource.indexOf('AIPlayerDailySummaryNaturalLanguageBlock') >= 0
    && firstScreenSource.indexOf('AIPlayerExecutionTraceBlock') < firstScreenSource.indexOf('AIPlayerDailySummaryNaturalLanguageBlock'),
  'AIPlayerExecutionTraceBlock must remain before the daily-summary block.'
);
assert.ok(
  firstScreenSource.indexOf('AIPlayerExecutionTraceBlock') >= 0
    && firstScreenSource.indexOf('AIPlayerHomeCityStatusBlock') >= 0
    && firstScreenSource.indexOf('AIPlayerExecutionTraceBlock') < firstScreenSource.indexOf('AIPlayerHomeCityStatusBlock'),
  'AIPlayerExecutionTraceBlock must outrank home-city/building status on the first screen.'
);

for (const forbiddenToken of [
  'proposalId',
  'relatedProposalId',
  'relatedReceiptProposalId',
  'worldAction',
  'worldActionPayload',
  'receipt',
  'plannerDecision',
  'observation',
]) {
  assert.ok(
    !firstScreenSource.includes(forbiddenToken),
    `Living-world first screen must not depend on backend/internal field ${forbiddenToken}.`
  );
}

assert.ok(
  aiPanelSource.includes('aiPanelLivingWorldFirstScreenContract'),
  'AI panel visual-smoke summary must expose aiPanelLivingWorldFirstScreenContract.'
);
assert.ok(
  aiPanelSource.includes('aiPanelExecutionTraceVisible'),
  'AI panel visual-smoke summary must expose aiPanelExecutionTraceVisible.'
);
assert.ok(
  aiPanelSource.includes('aiPanelLatestExecutionTraceSummary'),
  'AI panel visual-smoke summary must expose aiPanelLatestExecutionTraceSummary.'
);

assert.ok(
  mainSource.includes('"ai_panel_execution_trace_fixture"'),
  'main.gd must route the ai_panel_execution_trace_fixture click action.'
);
assert.ok(
  mainSource.includes('func _press_mainline_visual_smoke_ai_panel_execution_trace_fixture('),
  'main.gd must implement an AI panel execution-trace fixture action.'
);
assert.ok(
  mainSource.includes('playerRuntimeExecutionTraceReadModel')
    && mainSource.includes('playerRuntimeExecutionTraceItems'),
  'The AI panel execution-trace fixture must seed non-empty execution-trace read model and items.'
);
assert.ok(
  mainSource.includes('"aiPanelExecutionTraceVisible": bool(summary.get("aiPanelExecutionTraceVisible", false))'),
  'The fixture result must return aiPanelExecutionTraceVisible for screenshot gate validation.'
);

assert.ok(
  visualSmokeSource.includes('"ai_panel_execution_trace_fixture"'),
  'run_mainline_visual_smoke.py must allow ai_panel_execution_trace_fixture.'
);
assert.ok(
  /"ai_panel_execution_trace_fixture":\s*\{\s*"display_mode":\s*"world",\s*"world_action":\s*"open_hub_panel",\s*"panel_id":\s*"ai_hub"/s.test(visualSmokeSource),
  'ai_panel_execution_trace_fixture must open the AI hub through the formal visual smoke entry.'
);

assert.ok(
  closureBatchSource.includes('AI_PLAYER_LIVING_WORLD_FIRST_SCREEN_ACTIONS'),
  'closure batch must register the living-world first-screen action family.'
);
assert.ok(
  closureBatchSource.includes('"ai_panel_execution_trace_fixture"'),
  'closure batch must include ai_panel_execution_trace_fixture for formal closure validation.'
);
assert.ok(
  actionResultSource.includes('AI_PLAYER_LIVING_WORLD_FIRST_SCREEN_ACTIONS')
    && actionResultSource.includes('aiPanelExecutionTraceVisible')
    && actionResultSource.includes('traceBlockBeforeDailySummary'),
  'closure batch must validate the living-world first-screen fields from clickActionResult.'
);

console.log('godot_ai_panel_living_world_first_screen_contract: ok');
