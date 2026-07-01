import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function readJson(path: string): any {
  return JSON.parse(readUtf8(path))
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

const stageId = 861
const anchorId = 'world_naval_harbor_deployment_readiness_fixture'
const evidenceDirectory = 'tmp/stage861_world_naval_harbor_deployment_readiness_gameplay_anchor'
const formalSmokeCommand =
  'npm.cmd run godot:mainline:visual-smoke -- --server-script start --isolated-backend-state --timeout-sec 280 --backend-timeout-sec 180 --click-action world_naval_harbor_deployment_readiness_fixture --evidence-dir tmp/stage861_world_naval_harbor_deployment_readiness_gameplay_anchor --window-width 1920 --window-height 1080'
const guardScript = 'test:godot:world-naval-harbor-deployment-readiness-stage861-gameplay-anchor-contract'
const guardCommand = 'tsx server/tests/godot_world_naval_harbor_deployment_readiness_stage861_gameplay_anchor_contract.test.ts'
const anchorDocPath = 'docs/GODOT_WORLD_NAVAL_HARBOR_DEPLOYMENT_READINESS_GAMEPLAY_ANCHOR_CURRENT_2026_06_18.md'

const packageJson = readJson('package.json')
assert.equal(packageJson.scripts?.[guardScript], guardCommand, 'package.json must expose the Stage 861 gameplay anchor contract')

assert.ok(existsSync(anchorDocPath), `missing Stage 861 anchor doc: ${anchorDocPath}`)
const anchorDoc = readUtf8(anchorDocPath)
assertIncludes(anchorDoc, 'Status: current Godot world naval harbor deployment readiness gameplay anchor', 'anchor doc status')
assertIncludes(anchorDoc, formalSmokeCommand, 'anchor doc formal smoke command')
assertIncludes(anchorDoc, 'not hosted GitHub Actions evidence', 'anchor doc hosted CI non-claim')
assertIncludes(anchorDoc, 'not full fleet management UI', 'anchor doc scope non-claim')

const registry = readJson('ops/release-artifacts/local-dev.gameplay-anchor-registry.json')
const registered = registry.registeredAnchors?.find((entry: any) => entry.stageId === stageId && entry.anchorId === anchorId)
assert.ok(registered, 'gameplay anchor registry must register Stage 861 as a current formal anchor')
assert.equal(registered.anchorClass, 'formal-gameplay-anchor')
assert.equal(registered.status, 'formal-green-world-naval-harbor-deployment-readiness')
assert.equal(registered.clientInputOrClickAction, anchorId)
assert.equal(registered.formalSmokeCommand, formalSmokeCommand)
assert.equal(registered.evidenceDirectory, evidenceDirectory)
assert.equal(registered.summaryJsonPath, `${evidenceDirectory}/mainline_visual_smoke_summary.json`)
assert.equal(registered.godotReportJsonPath, `${evidenceDirectory}/godot_visual_smoke_report.json`)
assert.equal(registered.screenshotEvidencePath, `${evidenceDirectory}/01_after_${anchorId}.png`)
assert.equal(registered.tmpEvidenceRetentionClassification, 'formal-gameplay-anchor-evidence')
assert.ok(
  registered.serverReceiptOrReadModel.includes('openSeaRoute') &&
    registered.serverReceiptOrReadModel.includes('buildNavalWarshipAtHarbor') &&
    registered.serverReceiptOrReadModel.includes('openNavalHarborInventory') &&
    registered.serverReceiptOrReadModel.includes('deployment readiness'),
  'Stage 861 registry entry must name the sea route, shipyard build, harbor inventory, and deployment readiness authorities',
)
assert.deepEqual(registered.releaseOpsImpact, {
  clientPackage: 'Godot smoke action now promotes the existing naval harbor deployment readiness HUD path',
  serverArtifact: 'existing openNavalHarborInventory deployment readiness authority is consumed by Stage861 gameplay anchor and retained evidence metadata',
  aiSubject: 'AI reads approved naval deployment readiness summaries only; no subject payload expansion',
  opsRecovery: 'no restore/recovery producer change',
})
for (const nonClaim of [
  'not hosted GitHub Actions evidence',
  'not full fleet management UI',
  'not full port economy UI',
  'not staging or production endpoint evidence',
  'not a physical source split claim',
]) {
  assert.ok(registered.nonClaims.includes(nonClaim), `Stage 861 registry entry must include non-claim: ${nonClaim}`)
}

const retention = readJson('ops/release-artifacts/local-dev.tmp-evidence-retention.json')
const retained = retention.retainedEvidence?.find((entry: any) => entry.stage === stageId && entry.path === evidenceDirectory)
assert.ok(retained, 'tmp evidence retention must retain Stage 861 evidence')
assert.equal(retained.retentionClass, 'formal-gameplay-anchor-evidence')
assert.deepEqual(retained.requiredEvidenceFiles, ['mainline_visual_smoke_summary.json', 'godot_visual_smoke_report.json'])
assert.equal(retained.deletionRequiresExplicitUserApproval, true)

const progress = readJson('ops/release-artifacts/local-dev.boundary-convergence-progress.json')
const completedStage = progress.completedStages?.find((entry: any) => entry.stageId === stageId)
assert.ok(completedStage, 'Stage826 progress must record Stage 861')
assert.equal(completedStage.status, 'formal-green-world-naval-harbor-deployment-readiness-gameplay-anchor')
assert.ok(completedStage.evidence.includes(`${evidenceDirectory}/`))
assert.ok(
  completedStage.evidence.includes(
    'server/tests/godot_world_naval_harbor_deployment_readiness_stage861_gameplay_anchor_contract.test.ts',
  ),
)
const progressAnchor = progress.gameplayAnchors?.find((entry: any) => entry.stageId === stageId && entry.anchorId === anchorId)
assert.ok(progressAnchor, 'Stage826 gameplayAnchors must include Stage 861')
assert.equal(progressAnchor.smokeEvidence, `${evidenceDirectory}/`)
assert.ok(progress.mandatoryGuards?.includes('world_naval_harbor_deployment_readiness_stage861_gameplay_anchor_guard'))

const sweepManifest = readJson('ops/release-artifacts/local-dev.local-anchor-static-sweep.json')
assert.ok(sweepManifest.currentAnchorStages.includes(stageId), 'Stage856 sweep must include Stage 861')
assert.ok(
  sweepManifest.requiredAnchors?.some((entry: any) => entry.stageId === stageId && entry.anchorId === anchorId),
  'Stage856 sweep required anchors must include Stage 861',
)

const currentHandoff = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
assertIncludes(currentHandoff, 'Stage 861 - world naval harbor deployment readiness gameplay anchor', 'CURRENT handoff Stage 861 title')
assertIncludes(currentHandoff, formalSmokeCommand, 'CURRENT handoff Stage 861 formal command')
assertIncludes(currentHandoff, 'worldNavalHarborDeploymentReadinessOk=true', 'CURRENT handoff Stage 861 acceptance field')
assertIncludes(currentHandoff, 'not hosted GitHub Actions evidence', 'CURRENT handoff Stage 861 non-claim')

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 861 promotes `world_naval_harbor_deployment_readiness_fixture`', 'split target Stage 861 line')

const convergenceDoc = readUtf8('docs/CLIENT_SERVER_AI_OPS_BOUNDARY_CONVERGENCE_PROGRESS_CURRENT_2026_06_17.md')
assertIncludes(convergenceDoc, 'Stage 861 promotes `world_naval_harbor_deployment_readiness_fixture`', 'convergence doc Stage 861 line')

const plan = readUtf8('docs/superpowers/plans/2026-06-18-local-gameplay-anchor-pursuit-plan.md')
assertIncludes(plan, evidenceDirectory, 'Stage861 plan evidence dir')
assertIncludes(plan, formalSmokeCommand, 'Stage861 plan command')

const visualSmokeRunner = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')
assertIncludes(visualSmokeRunner, anchorId, 'visual smoke runner Stage 861 action')
assertIncludes(
  visualSmokeRunner,
  '_validate_world_naval_harbor_deployment_readiness_gameplay_anchor',
  'visual smoke runner Stage 861 validator',
)

const godotMain = readUtf8('godot-client/scripts/app/main.gd')
assertIncludes(godotMain, '"world_naval_harbor_deployment_readiness_fixture":', 'Godot Stage 861 dispatch')
assertIncludes(godotMain, 'deploymentReadinessUsesSharedDomainPolicy', 'Godot Stage 861 must consume shared deployment policy')
assertIncludes(godotMain, 'recommendedActionLabel', 'Godot Stage 861 must expose recommended action copy')
assertIncludes(godotMain, 'harborHudActionButtonStateOk', 'Godot Stage 861 must prove real Button state')

assert.ok(existsSync(`${evidenceDirectory}/mainline_visual_smoke_summary.json`), 'Stage 861 smoke summary evidence must exist')
assert.ok(existsSync(`${evidenceDirectory}/godot_visual_smoke_report.json`), 'Stage 861 Godot report evidence must exist')
assert.ok(existsSync(`${evidenceDirectory}/01_after_${anchorId}.png`), 'Stage 861 final screenshot evidence must exist')

const summary = readJson(`${evidenceDirectory}/mainline_visual_smoke_summary.json`)
assert.equal(summary.ok, true, 'Stage 861 formal smoke summary must be green')
assert.equal(summary.clickAction, anchorId)
const clickActionResult = summary.godotReport?.clickActionResult ?? {}
assert.equal(clickActionResult.ok, true, 'Stage 861 click action result must be green')
assert.equal(clickActionResult.worldNavalHarborDeploymentReadinessOk, true)
assert.equal(clickActionResult.deploymentReadinessUsesSharedDomainPolicy, true)
assert.equal(clickActionResult.deploymentPolicyScope, 'naval_deployment_readiness_only_not_full_fleet_management')
assert.equal(clickActionResult.worldNavalHarborDeploymentReadinessScope, 'deployment_readiness_hud_only_not_full_fleet_management')
assert.notEqual(clickActionResult.inventoryFleetId, '')
assert.equal(clickActionResult.harborId, 'east_han_coastal_dock_quanzhou')
assert.equal(clickActionResult.harborName, '泉州港')
assert.ok(['出港', '巡逻', '拦截', '整补', '待命'].includes(clickActionResult.recommendedActionLabel))
assert.equal(typeof clickActionResult.missionAllowed, 'boolean')
assert.equal(typeof clickActionResult.readinessScore, 'number')
assert.equal(typeof clickActionResult.riskScore, 'number')
assert.notEqual(clickActionResult.durabilityLabel, '')
assert.notEqual(clickActionResult.riskLabel, '')
assert.equal(clickActionResult.shouldPatrol, true)
assert.equal(clickActionResult.harborHudActionButtonStateOk, true)
assert.equal(clickActionResult.harborHudVisualSkinOk, true)
assert.equal(clickActionResult.harborActionHudUnifiedFamilyOk, true)
assert.equal(clickActionResult.harborActionHudCompactCopyOk, true)
assert.equal(clickActionResult.playerVisibleEngineeringCopyLeak, false)
assert.deepEqual(clickActionResult.visibleCopyForbiddenHits, [])

console.log('[godot_world_naval_harbor_deployment_readiness_stage861_gameplay_anchor_contract] all checks passed')
