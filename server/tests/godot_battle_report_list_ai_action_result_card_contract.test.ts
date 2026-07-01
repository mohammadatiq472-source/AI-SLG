import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const functionSource = (source: string, signature: string): string => {
  const start = source.indexOf(signature);
  if (start < 0) {
    return '';
  }
  const nextFunc = source.indexOf('\nfunc ', start + signature.length);
  const nextStaticFunc = source.indexOf('\nstatic func ', start + signature.length);
  const candidates = [nextFunc, nextStaticFunc].filter((index) => index > start);
  const end = candidates.length > 0 ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
};

const contractToken = 'battle_report_ai_action_result_card_v1';

const factorySource = readSource('godot-client/scripts/ui/slg_ui_component_factory.gd');
const presenterSource = readSource('godot-client/scripts/ui/presenters/battle_report_presenter.gd');
const listPageSource = readSource('godot-client/scripts/ui/battle_report_list_page.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const buildListContractsSource = functionSource(
  presenterSource,
  'func _build_list_contracts(',
);
const buildResultClusterSource = functionSource(
  listPageSource,
  'func _build_result_cluster(result_block: Dictionary) -> Control:',
);
const listSummarySource = functionSource(
  listPageSource,
  'func get_mainline_visual_smoke_list_summary() -> Dictionary:',
);

assert.ok(
  factorySource.includes(`const BATTLE_REPORT_AI_ACTION_RESULT_CARD_TOKEN := "${contractToken}"`) &&
    factorySource.includes('static func battle_report_ai_action_result_card_token() -> String:'),
  'factory must expose the stable battle report AI action-result card token.',
);

assert.ok(
  !buildListContractsSource.includes('"ai_action_result_contract": UI_COMPONENT_FACTORY.battle_report_ai_action_result_card_token()') &&
    !buildListContractsSource.includes('"ai_action_actor_label"') &&
    !buildListContractsSource.includes('"ai_action_reason_label"') &&
    !buildListContractsSource.includes('"ai_action_target_label"') &&
    !buildListContractsSource.includes('"ai_action_next_step_label"'),
  'battle report presenter must not attach Who/Why/Target/Next-step action-result payload to list result cards.',
);

assert.ok(
  !buildResultClusterSource.includes('_build_ai_action_result_card(result_block)') &&
    !listPageSource.includes('func _build_ai_action_result_card(result_block: Dictionary) -> Control:') &&
    !listPageSource.includes('BattleReportAiActionActor') &&
    !listPageSource.includes('BattleReportAiActionReason') &&
    !listPageSource.includes('BattleReportAiActionTarget') &&
    !listPageSource.includes('BattleReportAiActionNextStep'),
  'battle report list page must not render Who/Why/Target/Next-step rows under the result cluster.',
);

for (const requiredSummaryField of [
  '"battleReportListAiActionResultCardVisible"',
  '"battleReportListAiActionResultCardVisibleCount"',
]) {
  assert.ok(
    listSummarySource.includes(requiredSummaryField),
    `battle report list summary must expose ${requiredSummaryField}.`,
  );
}

assert.ok(
  visualSmokeSource.includes('"battleReportListAiActionResultCardVisible"') &&
    visualSmokeSource.includes('"battleReportListAiActionResultCardVisibleCount"') &&
    visualSmokeSource.includes('"battle_report_list_density"'),
  'battle_report_list_density formal visual smoke must require hidden action-result summary fields.',
);

assert.ok(
  closureBatchSource.includes('battleReportListAiActionResultCardVisibleCount') ||
    closureBatchSource.includes('battleReportListAiActionResultCardVisible'),
  'closure batch must keep a battle report list action-result visibility check.',
);

console.log('[godot_battle_report_list_ai_action_result_card_contract] all checks passed');
