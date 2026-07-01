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

const stageId = 858
const anchorId = 'shell_chat_unified_inbox_claim_reward_settlement'
const evidenceDirectory = 'tmp/stage858_unified_inbox_claim_reward_gameplay_anchor'
const formalSmokeCommand =
  'npm.cmd run godot:mainline:visual-smoke -- --server-script start --isolated-backend-state --timeout-sec 280 --backend-timeout-sec 180 --click-action shell_chat_unified_inbox_claim_reward_settlement --evidence-dir tmp/stage858_unified_inbox_claim_reward_gameplay_anchor --window-width 1920 --window-height 1080'
const guardScript = 'test:godot:unified-inbox-claim-reward-stage858-gameplay-anchor-contract'
const guardCommand = 'tsx server/tests/godot_unified_inbox_claim_reward_stage858_gameplay_anchor_contract.test.ts'
const anchorDocPath = 'docs/GODOT_UNIFIED_INBOX_CLAIM_REWARD_GAMEPLAY_ANCHOR_CURRENT_2026_06_18.md'

const packageJson = readJson('package.json')
assert.equal(packageJson.scripts?.[guardScript], guardCommand, 'package.json must expose the Stage 858 gameplay anchor contract')

assert.ok(existsSync(anchorDocPath), `missing Stage 858 anchor doc: ${anchorDocPath}`)
const anchorDoc = readUtf8(anchorDocPath)
assertIncludes(anchorDoc, 'Status: current Godot unified inbox claim reward gameplay anchor', 'anchor doc status')
assertIncludes(anchorDoc, formalSmokeCommand, 'anchor doc formal smoke command')
assertIncludes(anchorDoc, 'not hosted GitHub Actions evidence', 'anchor doc hosted CI non-claim')
assertIncludes(anchorDoc, 'not Stage 812 live inbox readback-only evidence', 'anchor doc Stage812 non-claim')

const registry = readJson('ops/release-artifacts/local-dev.gameplay-anchor-registry.json')
const registered = registry.registeredAnchors?.find((entry: any) => entry.stageId === stageId && entry.anchorId === anchorId)
assert.ok(registered, 'gameplay anchor registry must register Stage 858 as a current formal anchor')
assert.equal(registered.anchorClass, 'formal-gameplay-anchor')
assert.equal(registered.status, 'formal-green-unified-inbox-claim-reward')
assert.equal(registered.clientInputOrClickAction, anchorId)
assert.equal(registered.formalSmokeCommand, formalSmokeCommand)
assert.equal(registered.evidenceDirectory, evidenceDirectory)
assert.equal(registered.summaryJsonPath, `${evidenceDirectory}/mainline_visual_smoke_summary.json`)
assert.equal(registered.godotReportJsonPath, `${evidenceDirectory}/godot_visual_smoke_report.json`)
assert.equal(registered.screenshotEvidencePath, `${evidenceDirectory}/01_after_${anchorId}.png`)
assert.equal(registered.tmpEvidenceRetentionClassification, 'formal-gameplay-anchor-evidence')
assert.ok(
  registered.serverReceiptOrReadModel.includes('/api/inbox/claim') &&
    registered.serverReceiptOrReadModel.includes('claimReward') &&
    registered.serverReceiptOrReadModel.includes('/api/inbox readback'),
  'Stage 858 registry entry must name inbox claim receipt and post-claim readback',
)
assert.deepEqual(registered.releaseOpsImpact, {
  clientPackage: 'Godot smoke action now exercises the existing unified inbox claim button path',
  serverArtifact: 'existing /api/inbox/claim authority is consumed by Stage858 gameplay anchor and retained evidence metadata',
  aiSubject: 'AI reads approved inbox claim receipts/chat history only; no subject payload expansion',
  opsRecovery: 'no restore/recovery producer change',
})
for (const nonClaim of [
  'not hosted GitHub Actions evidence',
  'not Stage 812 live inbox readback-only evidence',
  'not a full mail category visual redesign',
  'not staging or production endpoint evidence',
  'not a physical source split claim',
]) {
  assert.ok(registered.nonClaims.includes(nonClaim), `Stage 858 registry entry must include non-claim: ${nonClaim}`)
}

const retention = readJson('ops/release-artifacts/local-dev.tmp-evidence-retention.json')
const retained = retention.retainedEvidence?.find((entry: any) => entry.stage === stageId && entry.path === evidenceDirectory)
assert.ok(retained, 'tmp evidence retention must retain Stage 858 evidence')
assert.equal(retained.retentionClass, 'formal-gameplay-anchor-evidence')
assert.deepEqual(retained.requiredEvidenceFiles, ['mainline_visual_smoke_summary.json', 'godot_visual_smoke_report.json'])
assert.equal(retained.deletionRequiresExplicitUserApproval, true)

const progress = readJson('ops/release-artifacts/local-dev.boundary-convergence-progress.json')
const completedStage = progress.completedStages?.find((entry: any) => entry.stageId === stageId)
assert.ok(completedStage, 'Stage826 progress must record Stage 858')
assert.equal(completedStage.status, 'formal-green-unified-inbox-claim-reward-gameplay-anchor')
assert.ok(completedStage.evidence.includes(`${evidenceDirectory}/`))
assert.ok(completedStage.evidence.includes('server/tests/godot_unified_inbox_claim_reward_stage858_gameplay_anchor_contract.test.ts'))
const progressAnchor = progress.gameplayAnchors?.find((entry: any) => entry.stageId === stageId && entry.anchorId === anchorId)
assert.ok(progressAnchor, 'Stage826 gameplayAnchors must include Stage 858')
assert.equal(progressAnchor.smokeEvidence, `${evidenceDirectory}/`)
assert.ok(progress.mandatoryGuards?.includes('unified_inbox_claim_reward_stage858_gameplay_anchor_guard'))

const sweepManifest = readJson('ops/release-artifacts/local-dev.local-anchor-static-sweep.json')
assert.ok(sweepManifest.currentAnchorStages.includes(stageId), 'Stage856 sweep must include Stage 858')
assert.ok(
  sweepManifest.requiredAnchors?.some((entry: any) => entry.stageId === stageId && entry.anchorId === anchorId),
  'Stage856 sweep required anchors must include Stage 858',
)

const currentHandoff = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
assertIncludes(currentHandoff, 'Stage 858 - unified inbox claim reward gameplay anchor', 'CURRENT handoff Stage 858 title')
assertIncludes(currentHandoff, formalSmokeCommand, 'CURRENT handoff Stage 858 formal command')
assertIncludes(currentHandoff, 'unified_inbox_claim_reward_settlement_verified', 'CURRENT handoff Stage 858 acceptance reason')
assertIncludes(currentHandoff, 'not hosted GitHub Actions evidence', 'CURRENT handoff Stage 858 non-claim')

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 858 promotes `shell_chat_unified_inbox_claim_reward_settlement`', 'split target Stage 858 line')

const convergenceDoc = readUtf8('docs/CLIENT_SERVER_AI_OPS_BOUNDARY_CONVERGENCE_PROGRESS_CURRENT_2026_06_17.md')
assertIncludes(convergenceDoc, 'Stage 858 promotes `shell_chat_unified_inbox_claim_reward_settlement`', 'convergence doc Stage 858 line')

const plan = readUtf8('docs/superpowers/plans/2026-06-18-local-gameplay-anchor-pursuit-plan.md')
assertIncludes(plan, evidenceDirectory, 'Stage858 plan evidence dir')
assertIncludes(plan, formalSmokeCommand, 'Stage858 plan command')

const visualSmokeRunner = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')
assertIncludes(visualSmokeRunner, anchorId, 'visual smoke runner Stage 858 action')
assertIncludes(visualSmokeRunner, '_validate_unified_inbox_claim_reward_settlement_contract', 'visual smoke runner Stage 858 validator')

const godotMain = readUtf8('godot-client/scripts/app/main.gd')
assertIncludes(godotMain, '"shell_chat_unified_inbox_claim_reward_settlement":', 'Godot Stage 858 dispatch')
assertIncludes(godotMain, 'unified_inbox_claim_reward_settlement_verified', 'Godot Stage 858 summary reason')
assertIncludes(godotMain, 'inboxClaimButtonPressed', 'Godot Stage 858 button press field')
assertIncludes(godotMain, 'inboxClaimReceiptOk', 'Godot Stage 858 receipt field')
assertIncludes(godotMain, 'inboxClaimPostReadbackOk', 'Godot Stage 858 post-claim readback field')

const chatOverlay = readUtf8('godot-client/scripts/ui/main_chat_overlay.gd')
assertIncludes(chatOverlay, 'run_mainline_visual_smoke_unified_inbox_claim_reward_settlement', 'MainChatOverlay Stage 858 visual smoke helper')
assertIncludes(chatOverlay, 'claim_unified_inbox_item', 'MainChatOverlay must use BackendApiClient inbox claim route')
assertIncludes(chatOverlay, '_format_claim_receipt_toast', 'MainChatOverlay must keep player-visible claim receipt copy')

assert.ok(existsSync(`${evidenceDirectory}/mainline_visual_smoke_summary.json`), 'Stage 858 smoke summary evidence must exist')
assert.ok(existsSync(`${evidenceDirectory}/godot_visual_smoke_report.json`), 'Stage 858 Godot report evidence must exist')
assert.ok(existsSync(`${evidenceDirectory}/01_after_${anchorId}.png`), 'Stage 858 final screenshot evidence must exist')

const summary = readJson(`${evidenceDirectory}/mainline_visual_smoke_summary.json`)
assert.equal(summary.ok, true, 'Stage 858 formal smoke summary must be green')
assert.equal(summary.clickAction, anchorId)
const clickActionResult = summary.godotReport?.clickActionResult ?? {}
assert.equal(clickActionResult.ok, true, 'Stage 858 click action result must be green')
assert.equal(clickActionResult.reason, 'unified_inbox_claim_reward_settlement_verified')
assert.equal(clickActionResult.inboxClaimButtonPressed, true)
assert.equal(clickActionResult.inboxClaimReceiptOk, true)
assert.equal(clickActionResult.inboxClaimPostReadbackOk, true)
assert.equal(clickActionResult.inboxClaimRoute, '/api/inbox/claim')
assert.equal(clickActionResult.inboxClaimWorldAction, 'claimReward')
assert.equal(clickActionResult.inboxClaimKind, 'event_reward')
assert.equal(clickActionResult.playerVisibleEngineeringCopyLeak, false)

console.log('[godot_unified_inbox_claim_reward_stage858_gameplay_anchor_contract] all checks passed')
