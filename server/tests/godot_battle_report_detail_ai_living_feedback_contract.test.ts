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
  const end = source.indexOf('\nfunc ', start + signature.length);
  return source.slice(start, end > start ? end : source.length);
};

const factorySource = readSource('godot-client/scripts/ui/slg_ui_component_factory.gd');
const detailPageSource = readSource('godot-client/scripts/ui/battle_report_detail_page.gd');
const presenterSource = readSource('godot-client/scripts/ui/presenters/battle_report_presenter.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const detailBlockBuilder = functionSource(
  detailPageSource,
  'func _build_detail_page_block(block_payload: Dictionary, detail_frame_contract: Dictionary) -> Control:',
);
const detailSummary = functionSource(
  detailPageSource,
  'func get_mainline_visual_smoke_detail_summary() -> Dictionary:',
);
const presenterDetailPages = functionSource(
  presenterSource,
  'func _build_detail_pages(',
);

assert.ok(
  factorySource.includes(
    'const BATTLE_REPORT_DETAIL_AI_LIVING_FEEDBACK_TOKEN := "battle_report_detail_ai_living_feedback_v1"',
  ) &&
    factorySource.includes('static func battle_report_detail_ai_living_feedback_token() -> String:'),
  'factory must expose a stable battle report AI living feedback token.',
);

assert.ok(
  presenterDetailPages.includes('ai_living_feedback_block') &&
    presenterSource.includes('"kind": "ai_living_feedback_card"') &&
    presenterSource.includes('"ai_living_feedback_contract": UI_COMPONENT_FACTORY.battle_report_detail_ai_living_feedback_token()') &&
    presenterSource.includes('func _build_ai_living_feedback_block('),
  'presenter must add an AI living feedback card to the first-open battle report detail contract.',
);

assert.ok(
  detailBlockBuilder.includes('"ai_living_feedback_card"') &&
    detailPageSource.includes('func _build_ai_living_feedback_card(block_payload: Dictionary) -> Control:') &&
    detailPageSource.includes('BattleReportAiLivingFeedbackCard') &&
    detailPageSource.includes('BattleReportAiLivingFeedbackActor') &&
    detailPageSource.includes('BattleReportAiLivingFeedbackAction') &&
    detailPageSource.includes('BattleReportAiLivingFeedbackReason') &&
    detailPageSource.includes('BattleReportAiLivingFeedbackResult'),
  'battle report detail page must render the AI living feedback card with named visible rows.',
);

for (const requiredSummaryField of [
  '"battleReportDetailAiLivingFeedbackToken"',
  '"battleReportDetailAiLivingFeedbackVisible"',
  '"battleReportDetailAiLivingFeedbackActorVisible"',
  '"battleReportDetailAiLivingFeedbackActionVisible"',
  '"battleReportDetailAiLivingFeedbackReasonVisible"',
  '"battleReportDetailAiLivingFeedbackResultVisible"',
]) {
  assert.ok(
    detailSummary.includes(requiredSummaryField),
    `detail summary must expose ${requiredSummaryField}`,
  );
}

assert.ok(
  visualSmokeSource.includes('"battle_report_seeded_open_detail"') &&
    visualSmokeSource.includes('"battleReportDetailAiLivingFeedbackToken"') &&
    visualSmokeSource.includes('"battleReportDetailAiLivingFeedbackVisible"'),
  'battle_report_seeded_open_detail must require AI living feedback summary fields in the formal visual smoke entry.',
);

assert.ok(
  closureBatchSource.includes('BATTLE_REPORT_DETAIL_AI_LIVING_FEEDBACK_TOKEN = "battle_report_detail_ai_living_feedback_v1"') &&
    closureBatchSource.includes('battleReportDetailAiLivingFeedbackToken!=battle_report_detail_ai_living_feedback_v1') &&
    closureBatchSource.includes('battleReportDetailAiLivingFeedbackVisible!=true') &&
    closureBatchSource.includes('battleReportDetailAiLivingFeedbackActorVisible!=true') &&
    closureBatchSource.includes('battleReportDetailAiLivingFeedbackActionVisible!=true') &&
    closureBatchSource.includes('battleReportDetailAiLivingFeedbackReasonVisible!=true') &&
    closureBatchSource.includes('battleReportDetailAiLivingFeedbackResultVisible!=true'),
  'closure batch must reject battle report detail screens that omit AI living feedback.',
);

console.log('[godot_battle_report_detail_ai_living_feedback_contract] all checks passed');
