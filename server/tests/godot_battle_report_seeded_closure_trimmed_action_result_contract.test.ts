import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const closureSource = fs.readFileSync(
  path.join(repoRoot, 'godot-client/tools/run_mainline_ui_closure_batch.py'),
  'utf8',
);

const functionSource = (source: string, signature: string): string => {
  const start = source.indexOf(signature);
  if (start < 0) {
    return '';
  }
  const next = source.indexOf('\ndef ', start + signature.length);
  return source.slice(start, next > start ? next : source.length);
};

const seededClosureSource = functionSource(
  closureSource,
  'def _validate_battle_report_seeded_closure_contract(page_summary: dict[str, Any]) -> list[str]:',
);

assert.ok(seededClosureSource, 'seeded battle-report closure validator must exist.');

assert.doesNotMatch(
  seededClosureSource,
  /battleReportList(?:Ai|Player)ActionResultCardVisibleCount<1|battleReportListAiAction(?:Actor|Reason|Target|NextStep)VisibleCount<1/,
  'seeded battle-report closure must not keep requiring the old dense list action-result card after the W15 list trim.',
);

for (const marker of [
  'battleReportListActionResultCardVisibleCount',
  'battleReportListAiActionResultCardVisible',
  'battleReportListAiActionResultCardVisibleCount',
  'battleReportListPlayerActionResultCardVisibleCount',
]) {
  assert.ok(
    seededClosureSource.includes(marker),
    `seeded battle-report closure must assert the trimmed action-result field ${marker}.`,
  );
}

for (const marker of [
  'battleReportFirstOpenStampMotionToken',
  'battleReportFirstOpenStampVisible',
  'battleReportFirstOpenStampMotionBound',
]) {
  assert.ok(
    closureSource.includes(marker),
    `battle-report detail closure must keep requiring first-open stamp field ${marker}.`,
  );
}

console.log('[godot_battle_report_seeded_closure_trimmed_action_result_contract] all checks passed');
