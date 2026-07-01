import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const factorySource = readSource('godot-client/scripts/ui/slg_ui_component_factory.gd');
const presenterSource = readSource('godot-client/scripts/ui/presenters/battle_report_presenter.gd');
const detailPageSource = readSource('godot-client/scripts/ui/battle_report_detail_page.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const feedbackBlockStart = presenterSource.indexOf('func _build_ai_living_feedback_block(');
const feedbackBlockEnd = presenterSource.indexOf('\nfunc ', feedbackBlockStart + 1);
const feedbackBlockSource =
  feedbackBlockStart >= 0 && feedbackBlockEnd > feedbackBlockStart
    ? presenterSource.slice(feedbackBlockStart, feedbackBlockEnd)
    : '';

const cardBuilderStart = detailPageSource.indexOf('func _build_ai_living_feedback_card(');
const cardBuilderEnd = detailPageSource.indexOf('\nfunc ', cardBuilderStart + 1);
const cardBuilderSource =
  cardBuilderStart >= 0 && cardBuilderEnd > cardBuilderStart
    ? detailPageSource.slice(cardBuilderStart, cardBuilderEnd)
    : '';

const detailSummaryStart = detailPageSource.indexOf('func get_mainline_visual_smoke_detail_summary()');
const detailSummaryEnd = detailPageSource.indexOf('\nfunc ', detailSummaryStart + 1);
const detailSummarySource =
  detailSummaryStart >= 0 && detailSummaryEnd > detailSummaryStart
    ? detailPageSource.slice(detailSummaryStart, detailSummaryEnd)
    : '';

assert.ok(
  factorySource.includes(
    'const BATTLE_REPORT_DETAIL_AI_ACTIVITY_CONTINUITY_TOKEN := "battle_report_detail_ai_activity_continuity_v1"',
  ) &&
    factorySource.includes('static func battle_report_detail_ai_activity_continuity_token() -> String:'),
  'factory must expose a stable battle-report AI activity continuity token.',
);

assert.ok(
  feedbackBlockSource.includes('"ai_activity_continuity_contract": UI_COMPONENT_FACTORY.battle_report_detail_ai_activity_continuity_token()') &&
    feedbackBlockSource.includes('"avatar_image_path":') &&
    feedbackBlockSource.includes('"status_dot":') &&
    feedbackBlockSource.includes('"status_reason":') &&
    feedbackBlockSource.includes('"execution_trace_count":') &&
    presenterSource.includes('func _resolve_battle_report_ai_activity_continuity('),
  'presenter must attach AI identity, status, and execution-trace continuity payload to the feedback card.',
);

assert.ok(
  cardBuilderSource.includes('_build_ai_living_identity_row(block_payload)'),
  'battle report detail AI feedback card must insert the AI living identity row before text rows.',
);

for (const requiredNodeName of [
  'BattleReportAiLivingIdentityRow',
  'BattleReportAiLivingAvatarFrame',
  'BattleReportAiLivingAvatarTexture',
  'BattleReportAiLivingStatusDot',
  'BattleReportAiLivingStatusLabel',
  'BattleReportAiLivingTraceCount',
]) {
  assert.ok(
    detailPageSource.includes(requiredNodeName),
    `battle report detail AI feedback card must render ${requiredNodeName}.`,
  );
}

for (const requiredSummaryField of [
  '"battleReportDetailAiActivityContinuityToken"',
  '"battleReportDetailAiActivityContinuityVisible"',
  '"battleReportDetailAiActivityAvatarVisible"',
  '"battleReportDetailAiActivityStatusDotVisible"',
  '"battleReportDetailAiActivityTraceCount"',
]) {
  assert.ok(
    detailSummarySource.includes(requiredSummaryField),
    `detail summary must expose ${requiredSummaryField}.`,
  );
}

assert.ok(
  visualSmokeSource.includes('"battleReportDetailAiActivityContinuityToken"') &&
    visualSmokeSource.includes('"battleReportDetailAiActivityContinuityVisible"') &&
    visualSmokeSource.includes('"battleReportDetailAiActivityAvatarVisible"') &&
    visualSmokeSource.includes('"battleReportDetailAiActivityStatusDotVisible"') &&
    visualSmokeSource.includes('"battleReportDetailAiActivityTraceCount"'),
  'battle_report_seeded_open_detail must require AI activity continuity summary fields.',
);

assert.ok(
  closureBatchSource.includes('BATTLE_REPORT_DETAIL_AI_ACTIVITY_CONTINUITY_TOKEN = "battle_report_detail_ai_activity_continuity_v1"') &&
    closureBatchSource.includes('battleReportDetailAiActivityContinuityToken!=battle_report_detail_ai_activity_continuity_v1') &&
    closureBatchSource.includes('battleReportDetailAiActivityContinuityVisible!=true') &&
    closureBatchSource.includes('battleReportDetailAiActivityAvatarVisible!=true') &&
    closureBatchSource.includes('battleReportDetailAiActivityStatusDotVisible!=true') &&
    closureBatchSource.includes('battleReportDetailAiActivityTraceCount<1'),
  'closure batch must reject battle report detail screens missing AI activity continuity.',
);

console.log('[godot_battle_report_detail_ai_activity_continuity_contract] all checks passed');
