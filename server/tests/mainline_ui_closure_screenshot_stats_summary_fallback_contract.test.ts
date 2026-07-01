import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const closureSource = fs.readFileSync(
  path.join(repoRoot, 'godot-client/tools/run_mainline_ui_closure_batch.py'),
  'utf8',
);

assert.ok(
  closureSource.includes('def _load_visual_smoke_summary_payload(payload: dict[str, Any]) -> dict[str, Any]:') &&
    closureSource.includes('artifacts.get("summaryReport", "")') &&
    closureSource.includes('loaded = json.loads(path.read_text(encoding="utf-8"))'),
  'closure batch must be able to load the full visual-smoke summary report from artifacts.summaryReport.',
);

assert.ok(
  closureSource.includes('def _resolve_visual_smoke_screenshot_stats(') &&
    closureSource.includes('if isinstance(inline_stats, dict) and inline_stats:') &&
    closureSource.includes('return summary_stats if isinstance(summary_stats, dict) else {}'),
  'closure batch must treat an empty stdout screenshotStats dict as missing and fall back to the full summary report.',
);

assert.ok(
  closureSource.includes('summary_payload = _load_visual_smoke_summary_payload(payload)') &&
    closureSource.includes('screenshot_stats = _resolve_visual_smoke_screenshot_stats(payload, summary_payload)'),
  'closure batch must use the screenshotStats resolver in _run_action.',
);

console.log('[mainline_ui_closure_screenshot_stats_summary_fallback_contract] all checks passed');
