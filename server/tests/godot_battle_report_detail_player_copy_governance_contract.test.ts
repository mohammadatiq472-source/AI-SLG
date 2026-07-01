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

const presenterSource = readSource('godot-client/scripts/ui/presenters/battle_report_presenter.gd');
const detailPageSource = readSource('godot-client/scripts/ui/battle_report_detail_page.gd');
const mainSource = readSource('godot-client/scripts/app/main.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');

const feedbackBlock = functionSource(
  presenterSource,
  'func _build_ai_living_feedback_block(',
);
const feedbackCard = functionSource(
  detailPageSource,
  'func _build_ai_living_feedback_card(block_payload: Dictionary) -> Control:',
);
const detailSummary = functionSource(
  detailPageSource,
  'func get_mainline_visual_smoke_detail_summary() -> Dictionary:',
);
const openDetailSmoke = functionSource(
  mainSource,
  'func _press_mainline_visual_smoke_battle_report_open_detail_tab(',
);

assert.ok(
  feedbackBlock.includes('_resolve_battle_report_detail_source_label(') &&
    presenterSource.includes('return _resolve_report_source_label(raw_source)') &&
    !feedbackBlock.includes('"battle_report_detail"') &&
    !feedbackBlock.includes('runtime_context.get("source"'),
  'battle report detail feedback source_label must be translated to player copy and must not fall back to raw runtime source or battle_report_detail.',
);

assert.ok(
  detailPageSource.includes('func _sanitize_ai_living_feedback_source_label(') &&
    feedbackCard.includes('_sanitize_ai_living_feedback_source_label(') &&
    !feedbackCard.includes('block_payload.get("source_label", "battle_report_detail")'),
  'detail page must sanitize the visible source label instead of rendering raw payload source_label.',
);

for (const requiredSummaryField of [
  '"battleReportDetailPlayerCopyOk"',
  '"visibleCopyForbiddenHits"',
  '"playerVisibleEngineeringCopyLeak"',
  '"sourceLabelVisible"',
  '"styleOwner"',
]) {
  assert.ok(
    detailSummary.includes(requiredSummaryField),
    `detail summary must expose ${requiredSummaryField}.`,
  );
}

assert.ok(
  openDetailSmoke.includes('battleReportDetailPlayerCopyOk') &&
    openDetailSmoke.includes('visibleCopyForbiddenHits') &&
    openDetailSmoke.includes('playerVisibleEngineeringCopyLeak') &&
    openDetailSmoke.includes('sourceLabelVisible') &&
    openDetailSmoke.includes('styleOwner'),
  'battle_report_seeded_open_detail click action must copy player-copy governance fields into the formal summary.',
);

assert.ok(
  visualSmokeSource.includes('"battleReportDetailPlayerCopyOk"') &&
    visualSmokeSource.includes('"visibleCopyForbiddenHits"') &&
    visualSmokeSource.includes('"playerVisibleEngineeringCopyLeak"') &&
    visualSmokeSource.includes('"sourceLabelVisible"') &&
    visualSmokeSource.includes('"styleOwner"') &&
    visualSmokeSource.includes('_validate_battle_report_detail_player_copy_governance('),
  'formal visual smoke must require battle report detail player-copy governance fields.',
);

console.log('[godot_battle_report_detail_player_copy_governance_contract] all checks passed');
