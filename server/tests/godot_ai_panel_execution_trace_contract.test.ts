import { strict as assert } from 'assert';
import { readFileSync } from 'fs';

const backendApiClientSource = readFileSync('godot-client/scripts/infra/http/backend_api_client.gd', 'utf-8');
const domainAdapterSource = readFileSync('godot-client/scripts/app/adapters/slg_domain_action_adapter.gd', 'utf-8');
const presenterSource = readFileSync('godot-client/scripts/ui/presenters/ai_panel_presenter.gd', 'utf-8');

const presenterHelperStart = presenterSource.indexOf('func _build_ai_execution_trace_cards(');
const presenterHelperEnd = presenterSource.indexOf('\nfunc ', presenterHelperStart + 1);
const presenterExecutionTraceHelper =
  presenterHelperStart >= 0 && presenterHelperEnd > presenterHelperStart
    ? presenterSource.slice(presenterHelperStart, presenterHelperEnd)
    : '';

assert.match(
  backendApiClientSource,
  /func get_ai_player_execution_trace\(ai_player_id: String, limit: int = 5\) -> Dictionary:/,
  'BackendApiClient must expose a typed execution-trace GET helper.'
);
assert.ok(
  backendApiClientSource.includes('/api/ai/players/%s/execution-trace?limit=%d'),
  'BackendApiClient execution-trace helper must call the backend execution-trace read model route.'
);

assert.ok(
  domainAdapterSource.includes('_api_client.get_ai_player_execution_trace(primary_ai_player_id, 5)'),
  'SLGDomainActionAdapter runtime refresh must request the primary AI player execution trace.'
);
assert.ok(
  domainAdapterSource.includes('playerRuntimeExecutionTraceReadModel'),
  'SLGDomainActionAdapter must persist the execution-trace read model into ai_state.'
);
assert.ok(
  domainAdapterSource.includes('playerRuntimeExecutionTraceItems'),
  'SLGDomainActionAdapter must persist execution-trace items into ai_state.'
);

assert.ok(
  presenterSource.includes('const AI_PLAYER_EXECUTION_TRACE_CONTRACT := "ai_player_execution_trace_first_screen_v1"'),
  'AIPanelPresenter must expose a stable execution-trace first-screen contract token.'
);
assert.ok(
  presenterSource.includes('ai_state.get("playerRuntimeExecutionTraceItems", [])'),
  'AIPanelPresenter must consume playerRuntimeExecutionTraceItems from ai_state.'
);
assert.ok(
  presenterSource.includes('ai_player_execution_trace_items'),
  'AIPanelPresenter must pass execution trace items into the AI players first-screen builder.'
);
assert.ok(
  presenterSource.includes('AIPlayerExecutionTraceBlock'),
  'AIPanelPresenter must render an AIPlayerExecutionTraceBlock on the AI players first screen.'
);
assert.ok(
  presenterSource.includes('func _format_ai_execution_trace_phase('),
  'AIPanelPresenter must translate execution-trace phase values for player-facing UI.'
);

const traceBlockIndex = presenterSource.indexOf('AIPlayerExecutionTraceBlock');
const dailySummaryBlockIndex = presenterSource.indexOf('AIPlayerDailySummaryNaturalLanguageBlock');
assert.ok(
  traceBlockIndex >= 0 && dailySummaryBlockIndex >= 0 && traceBlockIndex < dailySummaryBlockIndex,
  'AI execution trace must appear before the daily-summary report block on the first screen.'
);

for (const forbiddenToken of [
  'proposalId',
  'relatedProposalId',
  'relatedReceiptProposalId',
  'worldAction',
  'worldActionPayload',
  'plannerDecision',
  'observation',
  'receipt',
]) {
  assert.ok(
    !presenterExecutionTraceHelper.includes(forbiddenToken),
    `Execution-trace first-screen cards must not depend on backend/internal field ${forbiddenToken}.`
  );
}

console.log('godot_ai_panel_execution_trace_contract: ok');
