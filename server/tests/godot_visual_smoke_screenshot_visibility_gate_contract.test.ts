import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const visualSmoke = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

assert.ok(
  visualSmoke.includes('SCREENSHOT_VISIBILITY_GATE_CONTRACT = "screenshot_visibility_gate_v1"'),
  'Visual smoke runner must declare a stable screenshot visibility gate contract.',
)

assert.ok(
  visualSmoke.includes('def _screenshot_visibility_gate(stats: dict[str, Any]) -> dict[str, Any]:'),
  'Visual smoke runner must expose a reusable non-OCR screenshot visibility gate.',
)

for (const requiredField of [
  'luminanceMean',
  'luminanceSpan',
  'visiblePixelRatio',
  'screenshotVisibilityGate',
  'beforeCloseScreenshotVisibilityGate',
]) {
  assert.ok(visualSmoke.includes(requiredField), `Screenshot visibility gate must expose ${requiredField}.`)
}

assert.ok(
  visualSmoke.includes('and bool(screenshot_visibility_gate.get("ok", False))') &&
    visualSmoke.includes('and bool(pre_close_screenshot_visibility_gate.get("ok", False))'),
  'Top-level visual-smoke ok must require screenshot visibility gates, not only weak image stats.',
)

console.log('[godot_visual_smoke_screenshot_visibility_gate_contract] all checks passed')
