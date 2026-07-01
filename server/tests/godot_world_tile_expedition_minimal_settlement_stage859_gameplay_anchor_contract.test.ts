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

const stageId = 859
const anchorId = 'world_tile_expedition_minimal_settlement_fixture'
const evidenceDirectory = 'tmp/stage859_world_tile_expedition_minimal_settlement_gameplay_anchor'
const formalSmokeCommand =
  'npm.cmd run godot:mainline:visual-smoke -- --server-script start --isolated-backend-state --timeout-sec 280 --backend-timeout-sec 180 --click-action world_tile_expedition_minimal_settlement_fixture --evidence-dir tmp/stage859_world_tile_expedition_minimal_settlement_gameplay_anchor --window-width 1920 --window-height 1080'
const guardScript = 'test:godot:world-tile-expedition-minimal-settlement-stage859-gameplay-anchor-contract'
const guardCommand = 'tsx server/tests/godot_world_tile_expedition_minimal_settlement_stage859_gameplay_anchor_contract.test.ts'
const anchorDocPath = 'docs/GODOT_WORLD_TILE_EXPEDITION_MINIMAL_SETTLEMENT_GAMEPLAY_ANCHOR_CURRENT_2026_06_18.md'

const packageJson = readJson('package.json')
assert.equal(packageJson.scripts?.[guardScript], guardCommand, 'package.json must expose the Stage 859 gameplay anchor contract')

assert.ok(existsSync(anchorDocPath), `missing Stage 859 anchor doc: ${anchorDocPath}`)
const anchorDoc = readUtf8(anchorDocPath)
assertIncludes(anchorDoc, 'Status: current Godot world tile expedition minimal settlement gameplay anchor', 'anchor doc status')
assertIncludes(anchorDoc, formalSmokeCommand, 'anchor doc formal smoke command')
assertIncludes(anchorDoc, 'not hosted GitHub Actions evidence', 'anchor doc hosted CI non-claim')
assertIncludes(anchorDoc, 'not a full map-resource redesign', 'anchor doc scope non-claim')

const registry = readJson('ops/release-artifacts/local-dev.gameplay-anchor-registry.json')
const registered = registry.registeredAnchors?.find((entry: any) => entry.stageId === stageId && entry.anchorId === anchorId)
assert.ok(registered, 'gameplay anchor registry must register Stage 859 as a current formal anchor')
assert.equal(registered.anchorClass, 'formal-gameplay-anchor')
assert.equal(registered.status, 'formal-green-world-tile-expedition-minimal-settlement')
assert.equal(registered.clientInputOrClickAction, anchorId)
assert.equal(registered.formalSmokeCommand, formalSmokeCommand)
assert.equal(registered.evidenceDirectory, evidenceDirectory)
assert.equal(registered.summaryJsonPath, `${evidenceDirectory}/mainline_visual_smoke_summary.json`)
assert.equal(registered.godotReportJsonPath, `${evidenceDirectory}/godot_visual_smoke_report.json`)
assert.equal(registered.screenshotEvidencePath, `${evidenceDirectory}/01_after_${anchorId}.png`)
assert.equal(registered.tmpEvidenceRetentionClassification, 'formal-gameplay-anchor-evidence')
assert.ok(
  registered.serverReceiptOrReadModel.includes('occupyTile') &&
    registered.serverReceiptOrReadModel.includes('battle report') &&
    registered.serverReceiptOrReadModel.includes('map readback'),
  'Stage 859 registry entry must name occupyTile receipt, battle report, and map readback',
)
assert.deepEqual(registered.releaseOpsImpact, {
  clientPackage: 'Godot smoke action now promotes the existing land tile action HUD expedition path',
  serverArtifact: 'existing occupyTile authority is consumed by Stage859 gameplay anchor and retained evidence metadata',
  aiSubject: 'AI reads approved resource tile settlement and battle summaries only; no subject payload expansion',
  opsRecovery: 'no restore/recovery producer change',
})
for (const nonClaim of [
  'not hosted GitHub Actions evidence',
  'not a full map-resource redesign',
  'not a naval gameplay anchor',
  'not staging or production endpoint evidence',
  'not a physical source split claim',
]) {
  assert.ok(registered.nonClaims.includes(nonClaim), `Stage 859 registry entry must include non-claim: ${nonClaim}`)
}

const retention = readJson('ops/release-artifacts/local-dev.tmp-evidence-retention.json')
const retained = retention.retainedEvidence?.find((entry: any) => entry.stage === stageId && entry.path === evidenceDirectory)
assert.ok(retained, 'tmp evidence retention must retain Stage 859 evidence')
assert.equal(retained.retentionClass, 'formal-gameplay-anchor-evidence')
assert.deepEqual(retained.requiredEvidenceFiles, ['mainline_visual_smoke_summary.json', 'godot_visual_smoke_report.json'])
assert.equal(retained.deletionRequiresExplicitUserApproval, true)

const progress = readJson('ops/release-artifacts/local-dev.boundary-convergence-progress.json')
const completedStage = progress.completedStages?.find((entry: any) => entry.stageId === stageId)
assert.ok(completedStage, 'Stage826 progress must record Stage 859')
assert.equal(completedStage.status, 'formal-green-world-tile-expedition-minimal-settlement-gameplay-anchor')
assert.ok(completedStage.evidence.includes(`${evidenceDirectory}/`))
assert.ok(
  completedStage.evidence.includes(
    'server/tests/godot_world_tile_expedition_minimal_settlement_stage859_gameplay_anchor_contract.test.ts',
  ),
)
const progressAnchor = progress.gameplayAnchors?.find((entry: any) => entry.stageId === stageId && entry.anchorId === anchorId)
assert.ok(progressAnchor, 'Stage826 gameplayAnchors must include Stage 859')
assert.equal(progressAnchor.smokeEvidence, `${evidenceDirectory}/`)
assert.ok(progress.mandatoryGuards?.includes('world_tile_expedition_minimal_settlement_stage859_gameplay_anchor_guard'))

const sweepManifest = readJson('ops/release-artifacts/local-dev.local-anchor-static-sweep.json')
assert.ok(sweepManifest.currentAnchorStages.includes(stageId), 'Stage856 sweep must include Stage 859')
assert.ok(
  sweepManifest.requiredAnchors?.some((entry: any) => entry.stageId === stageId && entry.anchorId === anchorId),
  'Stage856 sweep required anchors must include Stage 859',
)

const currentHandoff = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
assertIncludes(currentHandoff, 'Stage 859 - world tile expedition minimal settlement gameplay anchor', 'CURRENT handoff Stage 859 title')
assertIncludes(currentHandoff, formalSmokeCommand, 'CURRENT handoff Stage 859 formal command')
assertIncludes(currentHandoff, 'world_tile_expedition_minimal_settlement_done', 'CURRENT handoff Stage 859 acceptance reason')
assertIncludes(currentHandoff, 'not hosted GitHub Actions evidence', 'CURRENT handoff Stage 859 non-claim')

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 859 promotes `world_tile_expedition_minimal_settlement_fixture`', 'split target Stage 859 line')

const convergenceDoc = readUtf8('docs/CLIENT_SERVER_AI_OPS_BOUNDARY_CONVERGENCE_PROGRESS_CURRENT_2026_06_17.md')
assertIncludes(convergenceDoc, 'Stage 859 promotes `world_tile_expedition_minimal_settlement_fixture`', 'convergence doc Stage 859 line')

const plan = readUtf8('docs/superpowers/plans/2026-06-18-local-gameplay-anchor-pursuit-plan.md')
assertIncludes(plan, evidenceDirectory, 'Stage859 plan evidence dir')
assertIncludes(plan, formalSmokeCommand, 'Stage859 plan command')

const visualSmokeRunner = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')
assertIncludes(visualSmokeRunner, anchorId, 'visual smoke runner Stage 859 action')
assertIncludes(
  visualSmokeRunner,
  '_validate_world_tile_expedition_minimal_settlement_gameplay_anchor',
  'visual smoke runner Stage 859 validator',
)

const godotMain = readUtf8('godot-client/scripts/app/main.gd')
assertIncludes(godotMain, '"world_tile_expedition_minimal_settlement_fixture":', 'Godot Stage 859 dispatch')
assertIncludes(godotMain, '_execute_world_tile_expedition_minimal_settlement', 'Godot Stage 859 backend action helper')
assertIncludes(godotMain, 'post_world_action("occupyTile"', 'Godot Stage 859 must call occupyTile authority')
assertIncludes(godotMain, 'battleRecordReadbackOk', 'Godot Stage 859 must expose battle readback')

assert.ok(existsSync(`${evidenceDirectory}/mainline_visual_smoke_summary.json`), 'Stage 859 smoke summary evidence must exist')
assert.ok(existsSync(`${evidenceDirectory}/godot_visual_smoke_report.json`), 'Stage 859 Godot report evidence must exist')
assert.ok(existsSync(`${evidenceDirectory}/01_after_${anchorId}.png`), 'Stage 859 final screenshot evidence must exist')

const summary = readJson(`${evidenceDirectory}/mainline_visual_smoke_summary.json`)
assert.equal(summary.ok, true, 'Stage 859 formal smoke summary must be green')
assert.equal(summary.clickAction, anchorId)
const clickActionResult = summary.godotReport?.clickActionResult ?? {}
const pageSummary = clickActionResult.pageContentSummary ?? {}
assert.equal(clickActionResult.ok, true, 'Stage 859 click action result must be green')
assert.equal(clickActionResult.reason, 'world_tile_expedition_minimal_settlement_done')
assert.equal(clickActionResult.clicked, true)
assert.equal(pageSummary.worldTileActionHudOpenOk, true)
assert.equal(pageSummary.worldTileExpeditionMinimalSettlementOk, true)
assert.equal(pageSummary.expeditionButtonVisible, true)
assert.equal(pageSummary.expeditionButtonClicked, true)
assert.notEqual(pageSummary.settlementReceiptId, '')
assert.notEqual(pageSummary.battleReportId, '')
assert.equal(pageSummary.battleRecordReadbackOk, true)
assert.equal(pageSummary.playerVisibleEngineeringCopyLeak, false)
assert.deepEqual(pageSummary.visibleCopyForbiddenHits, [])
assert.equal(pageSummary.worldTileActionHudScope, 'tile_action_hud_expedition_minimal_only_not_full_map_redesign')

console.log('[godot_world_tile_expedition_minimal_settlement_stage859_gameplay_anchor_contract] all checks passed')
