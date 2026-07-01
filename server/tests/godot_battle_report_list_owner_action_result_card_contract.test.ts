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

const presenterSource = readSource('godot-client/scripts/ui/presenters/battle_report_presenter.gd');
const listPageSource = readSource('godot-client/scripts/ui/battle_report_list_page.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const buildListContractsSource = functionSource(
  presenterSource,
  'func _build_list_contracts(',
);
const payloadSource = functionSource(
  presenterSource,
  'func _build_ai_action_result_card_payload(',
);
const summarySource = functionSource(
  listPageSource,
  'func get_mainline_visual_smoke_list_summary() -> Dictionary:',
);

assert.ok(
  buildListContractsSource.includes('_build_owner_action_result_card_payload(') &&
    !buildListContractsSource.includes('if owner_scope == "ai_player":'),
  'battle report presenter must build action-result payload for player, AI, and organization-owned list cards.',
);

assert.ok(
  presenterSource.includes('func _build_owner_action_result_card_payload(') &&
    presenterSource.includes('"player"') &&
    presenterSource.includes('"organization"') &&
    payloadSource === '',
  'presenter must replace the AI-only payload helper with an owner-aware helper.',
);

for (const requiredSummaryField of [
  '"battleReportListActionResultCardVisibleCount"',
  '"battleReportListPlayerActionResultCardVisibleCount"',
  '"battleReportListAiActionResultCardVisibleCount"',
  '"battleReportListOrganizationActionResultCardVisibleCount"',
]) {
  assert.ok(
    summarySource.includes(requiredSummaryField),
    `battle report list summary must expose ${requiredSummaryField}.`,
  );
}

assert.ok(
  visualSmokeSource.includes('"world_open_main_city_organization_reports"') &&
    visualSmokeSource.includes('"battleReportListOrganizationActionResultCardVisibleCount"') &&
    visualSmokeSource.includes('"battleReportListPlayerActionResultCardVisibleCount"'),
  'formal visual smoke must require owner action-result summary fields for player and organization list actions.',
);

assert.ok(
  closureBatchSource.includes('battleReportListPlayerActionResultCardVisibleCount<1') &&
    closureBatchSource.includes('battleReportListOrganizationActionResultCardVisibleCount<1') &&
    closureBatchSource.includes('organizationBattleReportActionResultCardVisibleCount<1'),
  'closure batch must reject player or organization battle report lists without owner action-result cards.',
);

console.log('[godot_battle_report_list_owner_action_result_card_contract] all checks passed');
