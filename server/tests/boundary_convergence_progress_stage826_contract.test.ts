import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

type StageStatus = {
  stageId: number | string
  name: string
  status: string
  evidence: string[]
}

type GameplayAnchor = {
  stageId: number | string
  anchorId: string
  clientSurface: string
  serverAuthority: string
  aiReadBoundary: string
  smokeEvidence: string
}

type ExternalBlocker = {
  stageId: number
  blockerId: string
  status: string
  unblockRequires: string
}

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['test:boundary-convergence-progress-stage826-contract'],
  'tsx server/tests/boundary_convergence_progress_stage826_contract.test.ts',
  'package.json must expose the Stage 826 boundary convergence progress contract',
)

const manifestPath = 'ops/release-artifacts/local-dev.boundary-convergence-progress.json'
const docPath = 'docs/CLIENT_SERVER_AI_OPS_BOUNDARY_CONVERGENCE_PROGRESS_CURRENT_2026_06_17.md'
const currentPath = 'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md'
const megaPlanPath = 'docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md'
const splitTargetPath = 'docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md'

assert.ok(existsSync(manifestPath), `missing Stage 826 boundary progress manifest: ${manifestPath}`)
assert.ok(existsSync(docPath), `missing Stage 826 boundary progress doc: ${docPath}`)

const manifest = JSON.parse(readUtf8(manifestPath)) as {
  status: string
  stage: number
  profileId: string
  boundaryDecision: {
    physicalSplitDecision: string
    sourceMovementAllowed: boolean
    fakeEndpointAllowed: boolean
    hostedRunEvidenceClaimed: boolean
    stagingProdProfilesClaimed: boolean
  }
  serviceProcessPolicy: {
    duplicateLaunchAllowed: boolean
    guardBeforeBackendStartingCommands: string
    prestartGuardCommand: string
    cleanupOlderCommand: string
    cleanupAllCommand: string
    tmpEvidenceCleanupDefault: string
  }
  completedStages: StageStatus[]
  gameplayAnchors: GameplayAnchor[]
  mandatoryGuards: string[]
  externalBlockers: ExternalBlocker[]
  nonClaims: string[]
}

assert.equal(manifest.status, 'current Stage 826 boundary convergence progress sentinel')
assert.equal(manifest.stage, 826)
assert.equal(manifest.profileId, 'local-dev')
assert.deepEqual(manifest.boundaryDecision, {
  physicalSplitDecision: 'not_ready',
  sourceMovementAllowed: false,
  fakeEndpointAllowed: false,
  hostedRunEvidenceClaimed: false,
  stagingProdProfilesClaimed: false,
})
assert.deepEqual(manifest.serviceProcessPolicy, {
  duplicateLaunchAllowed: false,
  guardBeforeBackendStartingCommands: 'npm.cmd run ops:service-process-guard',
  prestartGuardCommand: 'npm.cmd run ops:service-process-prestart',
  cleanupOlderCommand: 'npm.cmd run ops:service-process-cleanup-older',
  cleanupAllCommand: 'npm.cmd run ops:service-process-cleanup-all',
  tmpEvidenceCleanupDefault: 'dry-run-only',
})

for (const [stageId, status] of [
  [808, 'formal-green'],
  [809, 'formal-green'],
  [810, 'formal-green'],
  [811, 'formal-green'],
  [812, 'formal-green'],
  [813, 'formal-green'],
  [815, 'formal-green'],
  [816, 'boundary-green-not-server-authoritative'],
  [817, 'formal-green'],
  [818, 'formal-green'],
  ['818G', 'formal-green'],
  [819, 'formal-green'],
  [820, 'formal-green'],
  [821, 'formal-green'],
  [822, 'formal-green'],
  ['822E', 'formal-green'],
  ['822F', 'formal-green'],
  [827, 'formal-green'],
  [828, 'formal-green'],
  [829, 'formal-green-static-registry'],
  [830, 'formal-green-static-release-gate'],
  [831, 'formal-green-static-github-artifact-boundary'],
  [832, 'formal-green-static-github-failure-classifier'],
  [833, 'formal-green-static-current-handoff-paste-block'],
  [834, 'formal-green-static-service-launch-registry'],
  [835, 'formal-green-static-release-service-launch-registry-gate'],
  [836, 'formal-green-static-github-service-launch-registry-artifact'],
  [837, 'formal-green-static-github-antifreeze-summary'],
  [838, 'formal-green-static-release-boundary-mandatory-artifacts'],
  [839, 'formal-green-static-github-mandatory-artifacts-archive'],
  [840, 'formal-green-static-direct-backend-spawn-guard-index'],
  [841, 'formal-green-static-release-direct-backend-spawn-guard-gate'],
  [842, 'formal-green-static-release-candidate-dry-run-snapshot'],
  [843, 'formal-green-static-release-boundary-artifact-coverage'],
  [844, 'formal-green-static-release-boundary-historical-artifact-retention'],
  [845, 'formal-green-static-release-boundary-historical-artifact-cleanup-policy'],
  [846, 'formal-green-static-release-github-actions-summary-local-replay'],
  [847, 'formal-green-static-solo-local-release-gate-matrix'],
  [848, 'formal-green-static-solo-local-release-suite'],
  [849, 'formal-green'],
  [850, 'formal-green-static-gameplay-anchor-pursuit-plan'],
  [851, 'formal-green-readonly'],
  [852, 'formal-green-static-server-authority-gap'],
  [853, 'formal-green-server-authority-foundation'],
  [854, 'formal-green-server-authoritative-gameplay-anchor'],
  [855, 'formal-green-first-hour-task-claim-gameplay-anchor'],
  [856, 'formal-green-static-local-anchor-sweep'],
] as Array<[number | string, string]>) {
  const stage = manifest.completedStages.find((item) => item.stageId === stageId)
  assert.ok(stage, `manifest must include completed stage ${stageId}`)
  assert.equal(stage.status, status, `completed stage ${stageId} status mismatch`)
  assert.ok(stage.evidence.length > 0, `completed stage ${stageId} must list evidence`)
}

for (const [stageId, anchorId] of [
  [808, 'battle_report_seeded_open_detail'],
  [809, 'world_click_main_city_node_troop_submit_player_formation'],
  [810, 'player_history_seeded_save_restore_panel_open'],
  [811, 'world_open_main_city_organization_nation_midgame_realm_objective_bridge'],
  [812, 'world_open_main_city_mail_live_inbox_proof'],
  [813, 'ai_hub_proposal_approve_result_smoke'],
  [815, 'world_click_main_city_node_facility_building_tree_submit_upgrade'],
  [816, 'world_open_main_city_interior_affairs_press_first_action'],
  [817, 'world_open_main_city_recruit_single'],
  [818, 'world_affairs_claim_reward'],
  [819, 'ai_proposal_execute_receipt_boundary'],
  [849, 'world_ai_switch_open_home_city'],
  [851, 'world_open_main_city_interior_tax'],
  [854, 'world_open_main_city_interior_affairs_press_first_action'],
  [855, 'first_hour_land_loop_task_claim_prompt_gate'],
] as Array<[number | string, string]>) {
  const anchor = manifest.gameplayAnchors.find((item) => item.stageId === stageId)
  assert.ok(anchor, `manifest must include gameplay anchor ${stageId}`)
  assert.equal(anchor.anchorId, anchorId)
  assert.notEqual(anchor.clientSurface, '')
  assert.notEqual(anchor.serverAuthority, '')
  assert.notEqual(anchor.aiReadBoundary, '')
  assert.notEqual(anchor.smokeEvidence, '')
}

for (const requiredGuard of [
  'ops:service-process-guard',
  'ops:service-process-prestart',
  'backend_process_tree_cleanup',
  'release:candidate:local-dev',
  'release:artifact-drift:check',
  'ai_subject_packet_drift_private_input_guard',
  'ops_recovery_producer_drill',
  'ops:tmp-evidence-retention:check',
  'ops:tmp-evidence-cleanup:dry-run',
  'boundary_change_registration_guard',
  'gameplay_anchor_evidence_template_guard',
  'gameplay_anchor_registry_guard',
  'release_candidate_gameplay_anchor_registry_gate',
  'github_actions_boundary_artifact_archive_guard',
  'github_actions_failure_classifier_guard',
  'github_actions_current_handoff_paste_block_guard',
  'service_launch_boundary_registry_guard',
  'release_candidate_service_launch_registry_gate',
  'github_actions_service_launch_registry_artifact_guard',
  'github_actions_antifreeze_summary_guard',
  'release_boundary_mandatory_artifacts_guard',
  'github_actions_mandatory_artifacts_archive_guard',
  'direct_backend_spawn_guard_index_guard',
  'release_candidate_direct_backend_spawn_guard_gate',
  'release_candidate_dry_run_snapshot_guard',
  'release_boundary_artifact_coverage_guard',
  'release_boundary_historical_artifact_retention_guard',
  'release_boundary_historical_artifact_cleanup_policy_guard',
  'release_github_actions_summary_local_replay_guard',
  'solo_local_release_gate_matrix_guard',
  'solo_local_static_suite_guard',
  'gameplay_anchor_pursuit_plan_guard',
  'interior_affairs_server_authority_gap_guard',
  'interior_affairs_server_authority_foundation_guard',
  'interior_affairs_server_authority_adapter_guard',
  'first_hour_task_claim_prompt_stage855_gameplay_anchor_guard',
  'local_anchor_static_sweep_guard',
]) {
  assert.ok(manifest.mandatoryGuards.includes(requiredGuard), `missing mandatory guard: ${requiredGuard}`)
}

for (const [stageId, blockerId, status] of [
  [823, 'hosted_github_actions_run_archive', 'deferred_for_solo_local_until_real_hosted_run_needed'],
  [824, 'staging_prod_endpoint_profiles', 'blocked_until_real_public_endpoints'],
  [825, 'physical_split_readiness', 'blocked_until_stage_823_824_intentionally_green'],
] as Array<[number, string, string]>) {
  const blocker = manifest.externalBlockers.find((item) => item.stageId === stageId)
  assert.ok(blocker, `manifest must include blocker ${stageId}`)
  assert.equal(blocker.blockerId, blockerId)
  assert.equal(blocker.status, status)
  assert.notEqual(blocker.unblockRequires, '')
}

for (const nonClaim of [
  'no hosted GitHub Actions run evidence is claimed',
  'no staging/prod endpoint profile is invented',
  'no physical source movement is allowed',
  'no direct Godot proposal execute button is claimed',
  'no tmp evidence deletion is performed',
]) {
  assert.ok(manifest.nonClaims.includes(nonClaim), `missing non-claim: ${nonClaim}`)
}

const doc = readUtf8(docPath)
for (const token of [
  'Stage 826',
  manifestPath,
  'current Stage 826 boundary convergence progress sentinel',
  'duplicateLaunchAllowed=false',
  'sourceMovementAllowed=false',
  'fakeEndpointAllowed=false',
  'Stage 823',
  'Stage 824',
  'Stage 825',
]) {
  assertIncludes(doc, token, 'Stage 826 doc')
}

const current = readUtf8(currentPath)
assertIncludes(current, 'Stage 826 - Boundary Convergence Progress Sentinel', 'CURRENT handoff')
assertIncludes(current, manifestPath, 'CURRENT handoff')

const megaPlan = readUtf8(megaPlanPath)
assertIncludes(megaPlan, 'Stage 826', 'mega plan')
assertIncludes(megaPlan, 'boundary convergence progress sentinel', 'mega plan')

const splitTarget = readUtf8(splitTargetPath)
assertIncludes(splitTarget, 'Stage 826', 'split target')
assertIncludes(splitTarget, 'local-dev.boundary-convergence-progress.json', 'split target')

console.log('[boundary_convergence_progress_stage826_contract] all checks passed')
