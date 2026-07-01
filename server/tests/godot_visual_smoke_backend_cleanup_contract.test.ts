import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

function assertBefore(source: string, before: string, after: string, label: string): void {
  const beforeIndex = source.indexOf(before)
  const afterIndex = source.indexOf(after)
  assert.ok(beforeIndex >= 0, `${label} must include ${before}`)
  assert.ok(afterIndex >= 0, `${label} must include ${after}`)
  assert.ok(beforeIndex < afterIndex, `${label} must run ${before} before ${after}`)
}

function blockBetween(source: string, startToken: string, endToken: string, label: string): string {
  const startIndex = source.indexOf(startToken)
  assert.ok(startIndex >= 0, `${label} must include ${startToken}`)
  const endIndex = source.indexOf(endToken, startIndex + startToken.length)
  assert.ok(endIndex > startIndex, `${label} must include ${endToken} after ${startToken}`)
  return source.slice(startIndex, endIndex)
}

const packageJson = JSON.parse(readUtf8('package.json'))
assert.equal(
  packageJson.scripts?.['test:godot:visual-smoke-backend-cleanup-contract'],
  'tsx server/tests/godot_visual_smoke_backend_cleanup_contract.test.ts',
  'package.json must expose the Godot visual smoke backend cleanup contract',
)

const runner = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')

for (const token of [
  'def _parse_json_object_from_command_output(',
  'def _run_service_process_cleanup_all(',
  'def _cleanup_started_backend_process_tree(',
  'ops:service-process-cleanup-all',
  'backend_process_tree_cleanup',
  'serviceProcessCleanup',
  'processCountBefore',
  'processCountAfter',
  'cleanedProcessIds',
]) {
  assertIncludes(runner, token, 'Godot visual smoke backend cleanup guard')
}

const cleanupHelper = blockBetween(
  runner,
  'def _cleanup_started_backend_process_tree(',
  '\ndef _image_stats(',
  'Godot visual smoke backend cleanup helper',
)
for (const token of [
  '_terminate(process)',
  '_run_service_process_cleanup_all(log_path)',
  'backend_process_tree_cleanup',
  'processCountAfter',
  'cleanedProcessIds',
]) {
  assertIncludes(cleanupHelper, token, 'Godot visual smoke backend cleanup helper')
}
assertBefore(
  cleanupHelper,
  '_terminate(process)',
  '_run_service_process_cleanup_all(log_path)',
  'Godot visual smoke backend cleanup helper',
)

const mainSource = blockBetween(runner, 'def main() -> int:', '\nif __name__ == "__main__":', 'Godot visual smoke main')
const finalCleanupSource = mainSource.slice(mainSource.lastIndexOf('finally:'))
for (const token of [
  'if started_backend:',
  '_cleanup_started_backend_process_tree(backend_process, backend_log_path)',
  'summary["backendProcessCleanup"]',
  'summary["steps"].append({"name": "backend_process_tree_cleanup"',
  '_write_json(summary_path, summary)',
]) {
  assertIncludes(finalCleanupSource, token, 'Godot visual smoke final cleanup path')
}
assertBefore(
  finalCleanupSource,
  'if started_backend:',
  '_cleanup_started_backend_process_tree(backend_process, backend_log_path)',
  'Godot visual smoke final cleanup path',
)
assertBefore(
  finalCleanupSource,
  '_cleanup_started_backend_process_tree(backend_process, backend_log_path)',
  '_write_json(summary_path, summary)',
  'Godot visual smoke final cleanup summary persistence',
)

for (const path of [
  'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md',
  'docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md',
]) {
  const doc = readUtf8(path)
  for (const token of [
    'Stage 818G',
    'backend_process_tree_cleanup',
    'test:godot:visual-smoke-backend-cleanup-contract',
    'ops:service-process-cleanup-all',
  ]) {
    assertIncludes(doc, token, `${path} Stage 818G backend cleanup record`)
  }
}
