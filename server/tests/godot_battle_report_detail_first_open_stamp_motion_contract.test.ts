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

const token = 'battle_report_first_open_stamp_motion_v1';

const factorySource = readSource('godot-client/scripts/ui/slg_ui_component_factory.gd');
const detailPageSource = readSource('godot-client/scripts/ui/battle_report_detail_page.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const readySource = functionSource(detailPageSource, 'func _ready() -> void:');
const stampBuilderSource = functionSource(detailPageSource, 'func _ensure_first_open_stamp_motion() -> void:');
const summarySource = functionSource(detailPageSource, 'func get_mainline_visual_smoke_detail_summary() -> Dictionary:');

assert.ok(
  factorySource.includes(`const BATTLE_REPORT_FIRST_OPEN_STAMP_MOTION_TOKEN := "${token}"`) &&
    factorySource.includes('static func battle_report_first_open_stamp_motion_token() -> String:') &&
    factorySource.includes('static func apply_motion_battle_report_first_open_stamp('),
  'factory must expose a stable first-open stamp motion token and motion helper.',
);

assert.ok(
  readySource.includes('_ensure_first_open_stamp_motion()') &&
    stampBuilderSource.includes('BattleReportFirstOpenStamp') &&
    stampBuilderSource.includes('battle_report_first_open_stamp_motion_token()') &&
    stampBuilderSource.includes('apply_motion_battle_report_first_open_stamp'),
  'battle report detail page must create a named first-open stamp and bind the stamp motion.',
);

for (const field of [
  '"battleReportFirstOpenStampMotionToken"',
  '"battleReportFirstOpenStampVisible"',
  '"battleReportFirstOpenStampNodeCount"',
  '"battleReportFirstOpenStampMotionBound"',
  '"battleReportFirstOpenStampMotionScope"',
]) {
  assert.ok(summarySource.includes(field), `detail summary must expose ${field}.`);
}

assert.ok(
  visualSmokeSource.includes('"battleReportFirstOpenStampMotionToken"') &&
    visualSmokeSource.includes('"battleReportFirstOpenStampVisible"') &&
    visualSmokeSource.includes('"battle_report_seeded_open_detail"'),
  'battle_report_seeded_open_detail formal smoke must require first-open stamp fields.',
);

assert.ok(
  closureBatchSource.includes('battleReportFirstOpenStampMotionToken!=battle_report_first_open_stamp_motion_v1') &&
    closureBatchSource.includes('battleReportFirstOpenStampVisible!=true') &&
    closureBatchSource.includes('battleReportFirstOpenStampMotionBound!=true'),
  'closure batch must reject battle report detail without first-open stamp motion.',
);

console.log('[godot_battle_report_detail_first_open_stamp_motion_contract] all checks passed');
