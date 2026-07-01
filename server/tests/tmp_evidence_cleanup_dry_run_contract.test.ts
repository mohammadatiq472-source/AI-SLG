import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}
const cleanupScriptPath = 'scripts/run_tmp_evidence_cleanup.ts'
const manifestPath = 'ops/release-artifacts/local-dev.tmp-evidence-retention.json'
const currentPath = 'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md'
const targetPath = 'docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md'
const megaPlanPath = 'docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md'

assert.equal(
  packageJson.scripts?.['test:tmp-evidence-cleanup-dry-run-contract'],
  'tsx server/tests/tmp_evidence_cleanup_dry_run_contract.test.ts',
  'package.json must expose the tmp evidence cleanup dry-run contract',
)
assert.equal(
  packageJson.scripts?.['ops:tmp-evidence-cleanup:dry-run'],
  'tsx scripts/run_tmp_evidence_cleanup.ts --profile local-dev --dry-run',
  'package.json must expose only a dry-run tmp evidence cleanup command',
)
assert.equal(
  packageJson.scripts?.['ops:tmp-evidence-cleanup:apply'],
  undefined,
  'package.json must not expose a one-command deleting cleanup entry',
)

assert.ok(existsSync(manifestPath), `missing tmp evidence retention manifest: ${manifestPath}`)
assert.ok(existsSync(cleanupScriptPath), `missing tmp evidence cleanup script: ${cleanupScriptPath}`)

const cleanupScript = readUtf8(cleanupScriptPath)
for (const token of [
  '--dry-run',
  '--apply',
  '--confirm-delete-cleanable-candidates',
  'applyRequiresExplicitConfirmation',
  'cleanableCandidates',
  'retainedEvidence',
  'unclassifiedStageDirs',
  'wouldDeletePaths',
  'deletedPaths',
  'rmSync(',
  'process.exitCode = 1',
]) {
  assertIncludes(cleanupScript, token, 'tmp evidence cleanup script')
}
assert.ok(
  cleanupScript.indexOf('applyRequiresExplicitConfirmation') < cleanupScript.indexOf('rmSync('),
  'cleanup script must check explicit confirmation before deletion code',
)
assert.ok(
  cleanupScript.indexOf('unclassifiedStageDirs') < cleanupScript.indexOf('rmSync('),
  'cleanup script must classify local stage dirs before deletion code',
)

const current = readUtf8(currentPath)
const target = readUtf8(targetPath)
const megaPlan = readUtf8(megaPlanPath)
for (const token of [
  'Stage 822F - Tmp Evidence Cleanup Dry-Run Guard',
  'npm.cmd run ops:tmp-evidence-cleanup:dry-run',
  '--confirm-delete-cleanable-candidates',
]) {
  assertIncludes(current, token, 'CURRENT tmp evidence cleanup dry-run handoff')
}
for (const token of [
  'tmp evidence cleanup dry-run',
  'no one-command deleting npm entry',
]) {
  assertIncludes(target, token, 'split target tmp evidence cleanup dry-run record')
  assertIncludes(megaPlan, token, 'mega plan tmp evidence cleanup dry-run record')
}

console.log('[tmp_evidence_cleanup_dry_run_contract] all checks passed')
