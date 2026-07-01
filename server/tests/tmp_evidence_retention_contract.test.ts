import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

type TmpEvidenceEntry = {
  path: string
  retentionClass: string
  deletionRequiresExplicitUserApproval: boolean
  currentHandoffReference?: string
  supersededBy?: string
}

type TmpEvidenceRetentionManifest = {
  manifestKind: string
  profileId: string
  policy: {
    noAutomaticDeletion: boolean
    retainedEvidenceRequiresCurrentHandoffReference: boolean
    cleanableCandidatesAreNotDeletedByGate: boolean
  }
  retainedEvidence: TmpEvidenceEntry[]
  cleanableCandidates: TmpEvidenceEntry[]
}

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}
const validatorPath = 'scripts/validate_tmp_evidence_retention.ts'
const manifestPath = 'ops/release-artifacts/local-dev.tmp-evidence-retention.json'
const currentPath = 'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md'
const targetPath = 'docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md'
const megaPlanPath = 'docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md'

assert.equal(
  packageJson.scripts?.['test:tmp-evidence-retention-contract'],
  'tsx server/tests/tmp_evidence_retention_contract.test.ts',
  'package.json must expose the tmp evidence retention contract',
)
assert.equal(
  packageJson.scripts?.['ops:tmp-evidence-retention:check'],
  'tsx scripts/validate_tmp_evidence_retention.ts --profile local-dev',
  'package.json must expose the local-dev tmp evidence retention gate',
)

assert.ok(existsSync(validatorPath), `missing tmp evidence retention validator: ${validatorPath}`)
assert.ok(existsSync(manifestPath), `missing tmp evidence retention manifest: ${manifestPath}`)

const validator = readUtf8(validatorPath)
for (const token of [
  'local-dev.tmp-evidence-retention.json',
  'noAutomaticDeletion',
  'deletionRequiresExplicitUserApproval',
  'unclassifiedStageDirs',
  'process.exitCode = 1',
]) {
  assertIncludes(validator, token, 'tmp evidence retention validator')
}

const manifest = JSON.parse(readUtf8(manifestPath)) as TmpEvidenceRetentionManifest
assert.equal(manifest.manifestKind, 'tmp-evidence-retention')
assert.equal(manifest.profileId, 'local-dev')
assert.deepEqual(manifest.policy, {
  noAutomaticDeletion: true,
  retainedEvidenceRequiresCurrentHandoffReference: true,
  cleanableCandidatesAreNotDeletedByGate: true,
})

const retainedPaths = new Set(manifest.retainedEvidence.map((entry) => entry.path))
const cleanablePaths = new Set(manifest.cleanableCandidates.map((entry) => entry.path))
for (const path of [
  'tmp/stage808_battle_report_client_server_smoke',
  'tmp/stage809_main_city_troop_submit_gameplay_anchor',
  'tmp/stage810_player_history_save_restore_gameplay_anchor',
  'tmp/stage811_nation_realm_objective_gameplay_anchor',
  'tmp/stage812_inbox_live_gameplay_anchor',
  'tmp/stage813_ai_proposal_gameplay_anchor',
  'tmp/stage815_main_city_facility_upgrade_gameplay_anchor',
  'tmp/stage816_interior_affairs_action_probe',
  'tmp/stage817_recruit_draw_result_gameplay_anchor',
  'tmp/stage818_world_affairs_claim_reward_gameplay_anchor',
  'tmp/stage849_ai_switch_home_city_gameplay_anchor',
  'tmp/stage851_main_city_interior_tax_gameplay_anchor',
  'tmp/stage854_interior_affairs_server_authority_gameplay_anchor',
  'tmp/stage855_first_hour_task_claim_prompt_gameplay_anchor',
]) {
  assert.ok(retainedPaths.has(path), `retained formal evidence missing from manifest: ${path}`)
}
for (const path of [
  'tmp/stage809_main_city_troop_submit_anchor_probe',
  'tmp/stage810_player_history_save_restore_anchor_probe',
  'tmp/stage810_player_history_save_restore_anchor_probe_scrolled',
  'tmp/stage811_nation_realm_objective_anchor_probe',
  'tmp/stage812_inbox_live_gameplay_anchor_probe',
  'tmp/stage813_ai_proposal_gameplay_anchor_probe',
  'tmp/stage815_facility_upgrade_probe',
  'tmp/stage817_recruit_draw_result_probe',
]) {
  assert.ok(cleanablePaths.has(path), `cleanable probe evidence missing from manifest: ${path}`)
}

for (const entry of manifest.retainedEvidence) {
  assert.equal(entry.deletionRequiresExplicitUserApproval, true, `${entry.path} must require explicit deletion approval`)
  assert.ok(entry.currentHandoffReference?.includes('Stage'), `${entry.path} must cite a CURRENT stage reference`)
  assert.equal(cleanablePaths.has(entry.path), false, `${entry.path} must not be both retained and cleanable`)
}
for (const entry of manifest.cleanableCandidates) {
  assert.equal(entry.deletionRequiresExplicitUserApproval, true, `${entry.path} must require explicit deletion approval`)
  assert.ok(entry.supersededBy || entry.currentHandoffReference, `${entry.path} must explain why it is cleanable`)
  assert.equal(retainedPaths.has(entry.path), false, `${entry.path} must not be both cleanable and retained`)
}

if (existsSync('tmp')) {
  const classifiedPaths = new Set([...retainedPaths, ...cleanablePaths])
  const localStageDirs = readdirSync('tmp', { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^stage8\d+/.test(entry.name))
    .map((entry) => `tmp/${entry.name}`)
  for (const path of localStageDirs) {
    assert.ok(classifiedPaths.has(path), `local tmp stage dir is not classified: ${path}`)
  }
}

const current = readUtf8(currentPath)
const target = readUtf8(targetPath)
const megaPlan = readUtf8(megaPlanPath)
for (const token of [
  'Stage 822E - Tmp Evidence Retention Guard',
  'ops/release-artifacts/local-dev.tmp-evidence-retention.json',
  'npm.cmd run ops:tmp-evidence-retention:check',
]) {
  assertIncludes(current, token, 'CURRENT tmp evidence retention handoff')
}
for (const token of [
  'tmp evidence retention manifest',
  'cleanable candidates are not deleted by the gate',
]) {
  assertIncludes(target, token, 'split target tmp evidence retention record')
  assertIncludes(megaPlan, token, 'mega plan tmp evidence retention record')
}

console.log('[tmp_evidence_retention_contract] all checks passed')
