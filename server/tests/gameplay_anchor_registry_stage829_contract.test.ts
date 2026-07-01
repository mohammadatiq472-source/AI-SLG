import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

type AnchorRegistryEntry = {
  stageId: number | string
  anchorId: string
  anchorClass: string
  status: string
  playerVisibleGodotSurface: string
  playerVisibleCopyOwner: string
  clientInputOrClickAction: string
  serverAuthorityRouteOrProducer: string
  serverReceiptOrReadModel: string
  aiReadInputBoundary: {
    allowed: string[]
    forbidden: string[]
  }
  releaseOpsImpact: {
    clientPackage: string
    serverArtifact: string
    aiSubject: string
    opsRecovery: string
  }
  formalSmokeCommand: string
  evidenceDirectory: string
  summaryJsonPath: string
  godotReportJsonPath: string
  screenshotEvidencePath: string
  serviceProcessGuard: string
  tmpEvidenceRetentionClassification: string
  featureBoundaryCard: string
  currentHandoffReference: string
  nonClaims: string[]
}

type Stage826Anchor = {
  stageId: number | string
  anchorId: string
  clientSurface: string
  serverAuthority: string
  aiReadBoundary: string
  smokeEvidence: string
}

type TmpRetentionEntry = {
  path: string
  retentionClass: string
  stage: number
  requiredEvidenceFiles?: string[]
}

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['test:gameplay-anchor-registry-stage829-contract'],
  'tsx server/tests/gameplay_anchor_registry_stage829_contract.test.ts',
  'package.json must expose the Stage 829 gameplay anchor registry contract',
)

const registryPath = 'ops/release-artifacts/local-dev.gameplay-anchor-registry.json'
const docPath = 'docs/GODOT_GAMEPLAY_ANCHOR_REGISTRY_CURRENT_2026_06_17.md'
const templatePath = 'ops/release-artifacts/local-dev.gameplay-anchor-evidence-template.json'
const stage826Path = 'ops/release-artifacts/local-dev.boundary-convergence-progress.json'
const stage827Path = 'ops/release-artifacts/local-dev.boundary-change-registration.json'
const tmpRetentionPath = 'ops/release-artifacts/local-dev.tmp-evidence-retention.json'
const currentPath = 'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md'
const splitTargetPath = 'docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md'
const megaPlanPath = 'docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md'

assert.ok(existsSync(registryPath), `missing Stage 829 gameplay anchor registry: ${registryPath}`)
assert.ok(existsSync(docPath), `missing Stage 829 gameplay anchor registry doc: ${docPath}`)

const registry = JSON.parse(readUtf8(registryPath)) as {
  status: string
  stage: number
  profileId: string
  registryId: string
  sourceTemplate: string
  staticGuardCommand: string
  policy: {
    noNewSmokeStartedByRegistry: boolean
    clientCacheCannotBeServerTruth: boolean
    serviceProcessGuardBeforeAnyFutureSmoke: string
    retainedEvidenceManagedBy: string
    forbiddenPrivateInputs: string[]
  }
  registeredAnchors: AnchorRegistryEntry[]
  historicalReferenceAnchors: Array<{
    stageId: number
    anchorId: string
    status: string
    referenceClass: string
    evidenceReference: string
    notClaimedAsStage829NewAnchor: boolean
  }>
  driftChecks: string[]
  deniedClaims: string[]
}

assert.equal(registry.status, 'current Stage 829 gameplay anchor registry guard')
assert.equal(registry.stage, 829)
assert.equal(registry.profileId, 'local-dev')
assert.equal(registry.registryId, 'godot_gameplay_anchor_registry_v1')
assert.equal(registry.sourceTemplate, templatePath)
assert.equal(registry.staticGuardCommand, 'npm.cmd run test:gameplay-anchor-registry-stage829-contract')
assert.deepEqual(registry.policy, {
  noNewSmokeStartedByRegistry: true,
  clientCacheCannotBeServerTruth: true,
  serviceProcessGuardBeforeAnyFutureSmoke: 'npm.cmd run ops:service-process-guard',
  retainedEvidenceManagedBy: tmpRetentionPath,
  forbiddenPrivateInputs: [
    'private sourceRefs',
    'restore token',
    'provider key',
    'persistence path',
    'server-only fixture',
  ],
})

const requiredAnchors: Array<[number | string, string, string, string]> = [
  [808, 'battle_report_seeded_open_detail', 'formal-gameplay-anchor', 'formal-green'],
  [809, 'world_click_main_city_node_troop_submit_player_formation', 'formal-gameplay-anchor', 'formal-green'],
  [810, 'player_history_seeded_save_restore_panel_open', 'formal-gameplay-anchor', 'formal-green'],
  [811, 'world_open_main_city_organization_nation_midgame_realm_objective_bridge', 'formal-gameplay-anchor', 'formal-green'],
  [812, 'world_open_main_city_mail_live_inbox_proof', 'formal-gameplay-anchor', 'formal-green'],
  [813, 'ai_hub_proposal_approve_result_smoke', 'formal-gameplay-anchor', 'formal-green'],
  [815, 'world_click_main_city_node_facility_building_tree_submit_upgrade', 'formal-gameplay-anchor', 'formal-green'],
  [816, 'world_open_main_city_interior_affairs_press_first_action', 'boundary-proof-anchor', 'boundary-green-not-server-authoritative'],
  [817, 'world_open_main_city_recruit_single', 'formal-gameplay-anchor', 'formal-green'],
  [818, 'world_affairs_claim_reward', 'formal-gameplay-anchor', 'formal-green'],
  [819, 'ai_proposal_execute_receipt_boundary', 'server-receipt-boundary-anchor', 'formal-green'],
  [849, 'world_ai_switch_open_home_city', 'formal-gameplay-anchor', 'formal-green'],
  [851, 'world_open_main_city_interior_tax', 'formal-gameplay-anchor', 'formal-green-readonly'],
  [854, 'world_open_main_city_interior_affairs_press_first_action', 'formal-gameplay-anchor', 'formal-green-server-authoritative'],
  [855, 'first_hour_land_loop_task_claim_prompt_gate', 'formal-gameplay-anchor', 'formal-green-first-hour-task-claim'],
  [857, 'world_main_map_claim_release_cell', 'formal-gameplay-anchor', 'formal-green-main-map-claim-release'],
  [858, 'shell_chat_unified_inbox_claim_reward_settlement', 'formal-gameplay-anchor', 'formal-green-unified-inbox-claim-reward'],
  [859, 'world_tile_expedition_minimal_settlement_fixture', 'formal-gameplay-anchor', 'formal-green-world-tile-expedition-minimal-settlement'],
  [860, 'world_naval_harbor_inventory_open_fixture', 'formal-gameplay-anchor', 'formal-green-world-naval-harbor-inventory-open'],
  [861, 'world_naval_harbor_deployment_readiness_fixture', 'formal-gameplay-anchor', 'formal-green-world-naval-harbor-deployment-readiness'],
]

assert.equal(registry.registeredAnchors.length, requiredAnchors.length)

const stage826 = JSON.parse(readUtf8(stage826Path)) as {
  completedStages?: Array<{ stageId: number | string; status: string; evidence: string[] }>
  gameplayAnchors?: Stage826Anchor[]
  mandatoryGuards?: string[]
}
const tmpRetention = JSON.parse(readUtf8(tmpRetentionPath)) as {
  retainedEvidence?: TmpRetentionEntry[]
}

for (const [stageId, anchorId, anchorClass, status] of requiredAnchors) {
  const registered = registry.registeredAnchors.find((item) => item.stageId === stageId)
  assert.ok(registered, `registry missing Stage ${stageId}`)
  assert.equal(registered.anchorId, anchorId)
  assert.equal(registered.anchorClass, anchorClass)
  assert.equal(registered.status, status)
  assert.notEqual(registered.playerVisibleGodotSurface, '')
  assert.notEqual(registered.playerVisibleCopyOwner, '')
  assert.equal(registered.clientInputOrClickAction, anchorId)
  assert.notEqual(registered.serverAuthorityRouteOrProducer, '')
  assert.notEqual(registered.serverReceiptOrReadModel, '')
  if (stageId === 849) {
    assert.deepEqual(registered.releaseOpsImpact, {
      clientPackage: 'no client package content change in Stage 849',
      serverArtifact: 'registry and retained evidence metadata updated for Stage 849',
      aiSubject: 'AI subject read boundary documented, no subject payload expansion',
      opsRecovery: 'no restore/recovery producer change',
    })
  } else if (stageId === 851) {
    assert.deepEqual(registered.releaseOpsImpact, {
      clientPackage: 'no client package content change in Stage 851',
      serverArtifact: 'registry and retained evidence metadata updated for Stage 851',
      aiSubject: 'AI subject read boundary documented, no subject payload expansion',
      opsRecovery: 'no restore/recovery producer change',
    })
  } else if (stageId === 854) {
    assert.deepEqual(registered.releaseOpsImpact, {
      clientPackage: 'Godot adapter now consumes server work-order action receipt/readback',
      serverArtifact: 'Stage 853 route/receipt foundation is consumed by Stage 854 gameplay anchor',
      aiSubject: 'AI subject read boundary documented, no subject payload expansion',
      opsRecovery: 'no restore/recovery producer change',
    })
  } else if (stageId === 855) {
    assert.deepEqual(registered.releaseOpsImpact, {
      clientPackage: 'no runtime client package change; Stage855 refreshes current formal smoke evidence for existing first-hour task claim chain',
      serverArtifact: 'registry and retained evidence metadata now track the first-hour task claim prompt as current evidence',
      aiSubject: 'AI reads approved world tasks/current-goals packets only; no subject payload expansion',
      opsRecovery: 'no restore/recovery producer change',
    })
  } else if (stageId === 857) {
    assert.deepEqual(registered.releaseOpsImpact, {
      clientPackage: 'no runtime client package change; Stage857 refreshes current formal smoke evidence for existing main-map claim/release chain',
      serverArtifact: 'existing claimMainMapCell/releaseMainMapCell authority is consumed by Stage857 gameplay anchor and retained evidence metadata',
      aiSubject: 'AI reads approved map/change summaries only; no subject payload expansion',
      opsRecovery: 'no restore/recovery producer change',
    })
  } else if (stageId === 858) {
    assert.deepEqual(registered.releaseOpsImpact, {
      clientPackage: 'Godot smoke action now exercises the existing unified inbox claim button path',
      serverArtifact: 'existing /api/inbox/claim authority is consumed by Stage858 gameplay anchor and retained evidence metadata',
      aiSubject: 'AI reads approved inbox claim receipts/chat history only; no subject payload expansion',
      opsRecovery: 'no restore/recovery producer change',
    })
  } else if (stageId === 859) {
    assert.deepEqual(registered.releaseOpsImpact, {
      clientPackage: 'Godot smoke action now promotes the existing land tile action HUD expedition path',
      serverArtifact: 'existing occupyTile authority is consumed by Stage859 gameplay anchor and retained evidence metadata',
      aiSubject: 'AI reads approved resource tile settlement and battle summaries only; no subject payload expansion',
      opsRecovery: 'no restore/recovery producer change',
    })
  } else if (stageId === 860) {
    assert.deepEqual(registered.releaseOpsImpact, {
      clientPackage: 'Godot smoke action now promotes the existing naval harbor inventory HUD path',
      serverArtifact: 'existing openNavalHarborInventory authority is consumed by Stage860 gameplay anchor and retained evidence metadata',
      aiSubject: 'AI reads approved naval harbor inventory and fleet readiness summaries only; no subject payload expansion',
      opsRecovery: 'no restore/recovery producer change',
    })
  } else if (stageId === 861) {
    assert.deepEqual(registered.releaseOpsImpact, {
      clientPackage: 'Godot smoke action now promotes the existing naval harbor deployment readiness HUD path',
      serverArtifact: 'existing openNavalHarborInventory deployment readiness authority is consumed by Stage861 gameplay anchor and retained evidence metadata',
      aiSubject: 'AI reads approved naval deployment readiness summaries only; no subject payload expansion',
      opsRecovery: 'no restore/recovery producer change',
    })
  } else {
    assert.deepEqual(registered.releaseOpsImpact, {
      clientPackage: 'no client package content change in Stage 829',
      serverArtifact: 'registry-only release artifact metadata change',
      aiSubject: 'AI subject read boundary documented, no subject payload expansion',
      opsRecovery: 'no restore/recovery producer change',
    })
  }
  assert.equal(registered.serviceProcessGuard, 'npm.cmd run ops:service-process-guard')
  assert.notEqual(registered.featureBoundaryCard, '')
  assert.notEqual(registered.currentHandoffReference, '')
  assert.ok(registered.nonClaims.length > 0, `Stage ${stageId} must list non-claims`)

  for (const forbidden of registry.policy.forbiddenPrivateInputs) {
    assert.ok(
      registered.aiReadInputBoundary.forbidden.includes(forbidden),
      `Stage ${stageId} AI-read boundary must forbid ${forbidden}`,
    )
  }
  assert.ok(registered.aiReadInputBoundary.allowed.length > 0, `Stage ${stageId} must list allowed AI-read inputs`)

  const stage826Anchor = stage826.gameplayAnchors?.find((item) => item.stageId === stageId)
  assert.ok(stage826Anchor, `Stage 826 manifest missing gameplay anchor ${stageId}`)
  assert.equal(stage826Anchor.anchorId, anchorId)
  assertIncludes(registered.playerVisibleGodotSurface, stage826Anchor.clientSurface.split(' ')[0], `Stage ${stageId} client surface`)

  if (anchorClass === 'formal-gameplay-anchor' || anchorClass === 'boundary-proof-anchor') {
    assert.ok(registered.evidenceDirectory.startsWith('tmp/stage'), `Stage ${stageId} must use tmp stage evidence`)
    assert.ok(existsSync(registered.evidenceDirectory), `Stage ${stageId} evidence dir missing`)
    assert.ok(existsSync(registered.summaryJsonPath), `Stage ${stageId} summary JSON missing`)
    assert.ok(existsSync(registered.godotReportJsonPath), `Stage ${stageId} Godot report JSON missing`)
    assert.ok(existsSync(registered.screenshotEvidencePath), `Stage ${stageId} screenshot missing`)
    assertIncludes(registered.formalSmokeCommand, registered.clientInputOrClickAction, `Stage ${stageId} formal smoke command`)
    assertIncludes(registered.formalSmokeCommand, registered.evidenceDirectory, `Stage ${stageId} formal smoke command`)

    const retained = tmpRetention.retainedEvidence?.find((entry) => entry.stage === stageId)
    assert.ok(retained, `tmp retention manifest missing Stage ${stageId}`)
    assert.equal(registered.tmpEvidenceRetentionClassification, retained.retentionClass)
    assert.equal(retained.path, registered.evidenceDirectory)
    for (const file of retained.requiredEvidenceFiles ?? []) {
      assert.ok(existsSync(`${registered.evidenceDirectory}/${file}`), `Stage ${stageId} retained evidence missing ${file}`)
    }
  }

  if (stageId === 816) {
    assertIncludes(registered.serverAuthorityRouteOrProducer, 'not server-authoritative', 'Stage 816 server boundary')
    assertIncludes(registered.nonClaims.join('\n'), 'not a server-authoritative gameplay anchor', 'Stage 816 non-claim')
  }

  if (stageId === 819) {
    assert.equal(registered.evidenceDirectory, 'not-applicable-server-receipt-boundary')
    assert.equal(registered.summaryJsonPath, 'not-applicable-server-receipt-boundary')
    assert.equal(registered.godotReportJsonPath, 'not-applicable-server-receipt-boundary')
    assert.equal(registered.screenshotEvidencePath, 'player_history_ai_execution_receipt_panel_open')
    assertIncludes(registered.nonClaims.join('\n'), 'no direct Godot execute button is claimed', 'Stage 819 non-claim')
  }

  if (stageId === 849) {
    assertIncludes(registered.serverAuthorityRouteOrProducer, 'AI home-city bind and facility-entry read model', 'Stage 849 server authority')
    assertIncludes(registered.nonClaims.join('\n'), 'not an AI direct-control or automation proof', 'Stage 849 non-claim')
  }

  if (stageId === 851) {
    assertIncludes(registered.serverAuthorityRouteOrProducer, 'main-city interior read model', 'Stage 851 server authority')
    assertIncludes(registered.nonClaims.join('\n'), 'not a tax-collection mutation proof', 'Stage 851 non-claim')
  }

  if (stageId === 854) {
    assertIncludes(registered.serverAuthorityRouteOrProducer, '/api/world/main-city/interior/work-orders', 'Stage 854 server authority')
    assertIncludes(registered.serverReceiptOrReadModel, 'server_interior_work_order_action', 'Stage 854 server receipt')
    assertIncludes(registered.nonClaims.join('\n'), 'not hosted GitHub Actions evidence', 'Stage 854 non-claim')
  }

  if (stageId === 855) {
    assertIncludes(registered.serverAuthorityRouteOrProducer, 'claimTaskReward', 'Stage 855 server authority')
    assertIncludes(registered.serverReceiptOrReadModel, '/api/world/tasks', 'Stage 855 task readback')
    assertIncludes(registered.serverReceiptOrReadModel, 'current goals', 'Stage 855 current goals readback')
    assertIncludes(registered.nonClaims.join('\n'), 'not a Stage 208 historical replay claim', 'Stage 855 non-claim')
  }

  if (stageId === 860) {
    assertIncludes(registered.serverAuthorityRouteOrProducer, 'openNavalHarborInventory', 'Stage 860 server authority')
    assertIncludes(registered.serverReceiptOrReadModel, 'buildNavalWarshipAtHarbor', 'Stage 860 shipyard receipt')
    assertIncludes(registered.nonClaims.join('\n'), 'not full fleet management UI', 'Stage 860 non-claim')
  }

  if (stageId === 861) {
    assertIncludes(registered.serverAuthorityRouteOrProducer, 'openNavalHarborInventory', 'Stage 861 server authority')
    assertIncludes(registered.serverReceiptOrReadModel, 'deployment readiness', 'Stage 861 deployment readiness receipt')
    assertIncludes(registered.nonClaims.join('\n'), 'not full fleet management UI', 'Stage 861 non-claim')
  }
}

for (const token of [
  'Stage 826 gameplayAnchors are all registered',
  'tmp retained formal evidence is all registered',
  'Stage 828 template fields are represented',
  'Stage 827 gameplay-anchor policy requires the registry',
  'Stage 816 remains boundary-only',
  'Stage 819 remains receipt-recovery-only',
  'historical Stage 208 first-hour task claim is reference-only',
  'Stage 849 AI switch home-city remains readonly observation-only',
  'Stage 851 tax page remains readonly and does not claim a tax-collection mutation',
  'Stage 854 interior affairs consumes server receipt/readback and supersedes Stage 816 only as a formal anchor',
]) {
  assert.ok(registry.driftChecks.includes(token), `registry missing drift check: ${token}`)
}

const firstHourReference = registry.historicalReferenceAnchors.find(
  (item) => item.stageId === 208 && item.anchorId === 'first_hour_land_loop_task_claim_prompt_gate',
)
assert.ok(firstHourReference, 'registry must keep Stage 208 first-hour task claim as a historical reference')
assert.equal(firstHourReference.notClaimedAsStage829NewAnchor, true)
assert.equal(firstHourReference.referenceClass, 'historical-reference')

for (const deniedClaim of [
  'registry entry without Stage 826 gameplayAnchors match',
  'formal gameplay anchor without retained tmp evidence',
  'client cache described as server truth',
  'AI-readable packet includes private sourceRefs, restore token, provider key, persistence path, or server-only fixture',
  'Stage 829 starts Godot smoke or backend server',
]) {
  assert.ok(registry.deniedClaims.includes(deniedClaim), `registry missing denied claim: ${deniedClaim}`)
}

const stage827 = JSON.parse(readUtf8(stage827Path)) as {
  requiredSurfaces?: Array<{ id: string; path?: string }>
  stageTypePolicies?: Array<{ stageType: string; mustRegister: string[] }>
}
const registrySurface = stage827.requiredSurfaces?.find((item) => item.id === 'gameplay_anchor_registry')
assert.ok(registrySurface, 'Stage 827 registration manifest must include gameplay_anchor_registry')
assert.equal(registrySurface.path, registryPath)
const gameplayPolicy = stage827.stageTypePolicies?.find((item) => item.stageType === 'gameplay-anchor')
assert.ok(gameplayPolicy?.mustRegister.includes('gameplay_anchor_registry'), 'gameplay-anchor policy must require registry')

const stage829 = stage826.completedStages?.find((item) => item.stageId === 829)
assert.ok(stage829, 'Stage 826 convergence manifest must record Stage 829')
assert.equal(stage829.status, 'formal-green-static-registry')
assert.ok(stage829.evidence.includes(registryPath), 'Stage 829 evidence must include the gameplay anchor registry')
assert.ok(stage826.mandatoryGuards?.includes('gameplay_anchor_registry_guard'), 'Stage 826 must list registry guard')

const doc = readUtf8(docPath)
for (const token of [
  'Stage 829',
  registryPath,
  'current Stage 829 gameplay anchor registry guard',
  'does not start `server:dev`, `tsx watch`, Godot export, or a smoke backend',
  'Stage 816 remains boundary-only',
  'Stage 819 remains receipt-recovery-only',
  'Stage 208 first-hour task claim remains historical-reference',
]) {
  assertIncludes(doc, token, 'Stage 829 doc')
}

const current = readUtf8(currentPath)
assertIncludes(current, 'Stage 829 - Gameplay Anchor Registry Guard', 'CURRENT handoff')
assertIncludes(current, registryPath, 'CURRENT handoff')

const splitTarget = readUtf8(splitTargetPath)
assertIncludes(splitTarget, 'Stage 829', 'split target')
assertIncludes(splitTarget, 'local-dev.gameplay-anchor-registry.json', 'split target')

const megaPlan = readUtf8(megaPlanPath)
assertIncludes(megaPlan, 'Stage 829', 'mega plan')
assertIncludes(megaPlan, 'gameplay anchor registry guard', 'mega plan')

console.log('[gameplay_anchor_registry_stage829_contract] all checks passed')
