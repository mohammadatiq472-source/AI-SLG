import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

type MinimumEvidenceField = {
  id: string
  requiredFor: string
}

type AnchorExample = {
  stageId: number
  anchorId: string
  evidenceKind: string
  serverAuthority: string
  aiReadBoundary: string
}

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['test:gameplay-anchor-evidence-template-stage828-contract'],
  'tsx server/tests/gameplay_anchor_evidence_template_stage828_contract.test.ts',
  'package.json must expose the Stage 828 gameplay anchor evidence template contract',
)

const templatePath = 'ops/release-artifacts/local-dev.gameplay-anchor-evidence-template.json'
const docPath = 'docs/GODOT_GAMEPLAY_ANCHOR_EVIDENCE_TEMPLATE_CURRENT_2026_06_17.md'
const stage826ManifestPath = 'ops/release-artifacts/local-dev.boundary-convergence-progress.json'
const stage827ManifestPath = 'ops/release-artifacts/local-dev.boundary-change-registration.json'
const currentPath = 'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md'
const megaPlanPath = 'docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md'
const splitTargetPath = 'docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md'

assert.ok(existsSync(templatePath), `missing Stage 828 gameplay anchor evidence template: ${templatePath}`)
assert.ok(existsSync(docPath), `missing Stage 828 gameplay anchor evidence template doc: ${docPath}`)

const template = JSON.parse(readUtf8(templatePath)) as {
  status: string
  stage: number
  profileId: string
  templateId: string
  appliesTo: string
  staticGuardCommand: string
  minimumEvidenceFields: MinimumEvidenceField[]
  evidencePathRequirements: {
    evidenceDirectoryRoot: string
    summaryJson: string
    godotReportJson: string
    screenshotPattern: string
  }
  requiredBoundaryLinks: string[]
  requiredFormalCommands: string[]
  existingAnchorExamples: AnchorExample[]
  deniedClaims: string[]
}

assert.equal(template.status, 'current Stage 828 gameplay anchor evidence template guard')
assert.equal(template.stage, 828)
assert.equal(template.profileId, 'local-dev')
assert.equal(template.templateId, 'godot_gameplay_anchor_evidence_template_v1')
assert.equal(template.appliesTo, 'future Godot gameplay anchors with player-visible operation loops')
assert.equal(template.staticGuardCommand, 'npm.cmd run test:gameplay-anchor-evidence-template-stage828-contract')

for (const requiredField of [
  'stageId',
  'anchorId',
  'playerVisibleGodotSurface',
  'playerVisibleCopyOwner',
  'clientInputOrClickAction',
  'serverAuthorityRouteOrProducer',
  'serverReceiptOrReadModel',
  'aiReadInputBoundary',
  'releaseOpsImpact',
  'formalSmokeCommand',
  'evidenceDirectory',
  'summaryJsonPath',
  'godotReportJsonPath',
  'screenshotEvidencePath',
  'serviceProcessGuard',
  'featureBoundaryCard',
  'stage826ConvergenceUpdate',
  'currentHandoffUpdate',
  'tmpEvidenceRetentionClassification',
  'nonClaims',
]) {
  const field = template.minimumEvidenceFields.find((item) => item.id === requiredField)
  assert.ok(field, `template must require evidence field: ${requiredField}`)
  assert.notEqual(field.requiredFor, '', `${requiredField} must explain why it is required`)
}

assert.deepEqual(template.evidencePathRequirements, {
  evidenceDirectoryRoot: 'tmp/stageNNN_<anchor_id>',
  summaryJson: 'mainline_visual_smoke_summary.json',
  godotReportJson: 'godot_visual_smoke_report.json',
  screenshotPattern: '01_after_<click_action>.png',
})

for (const boundaryLink of [
  'Feature Boundary Card',
  'Stage 826 convergence sentinel',
  'Stage 827 boundary change registration',
  'tmp evidence retention manifest',
  'service process policy',
]) {
  assert.ok(template.requiredBoundaryLinks.includes(boundaryLink), `template missing boundary link: ${boundaryLink}`)
}

for (const command of [
  'npm.cmd run ops:service-process-guard',
  'npm.cmd run test:<stage-gameplay-anchor-contract>',
  'npm.cmd run godot:mainline:visual-smoke -- --click-action <click_action> --window-width 1920 --window-height 1080 --isolated-backend-state --evidence-dir tmp/stageNNN_<anchor_id>',
  'npm.cmd run ops:tmp-evidence-retention:check',
]) {
  assert.ok(template.requiredFormalCommands.includes(command), `template missing formal command: ${command}`)
}

for (const [stageId, anchorId, evidenceKind] of [
  [808, 'battle_report_seeded_open_detail', 'formal-smoke'],
  [809, 'world_click_main_city_node_troop_submit_player_formation', 'formal-smoke'],
  [810, 'player_history_seeded_save_restore_panel_open', 'formal-smoke'],
  [811, 'world_open_main_city_organization_nation_midgame_realm_objective_bridge', 'formal-smoke'],
  [812, 'world_open_main_city_mail_live_inbox_proof', 'formal-smoke'],
  [813, 'ai_hub_proposal_approve_result_smoke', 'formal-smoke'],
  [815, 'world_click_main_city_node_facility_building_tree_submit_upgrade', 'formal-smoke'],
  [816, 'world_open_main_city_interior_affairs_press_first_action', 'boundary-only-smoke'],
  [817, 'world_open_main_city_recruit_single', 'formal-smoke'],
  [818, 'world_affairs_claim_reward', 'formal-smoke'],
  [819, 'ai_proposal_execute_receipt_boundary', 'server-receipt-plus-visible-recovery'],
] as Array<[number, string, string]>) {
  const example = template.existingAnchorExamples.find((item) => item.stageId === stageId)
  assert.ok(example, `template must include prior anchor example Stage ${stageId}`)
  assert.equal(example.anchorId, anchorId)
  assert.equal(example.evidenceKind, evidenceKind)
  assert.notEqual(example.serverAuthority, '')
  assert.notEqual(example.aiReadBoundary, '')
}

for (const deniedClaim of [
  'Godot screenshot only without server authority proof',
  'client cache described as server truth',
  'AI-read boundary omitted from gameplay anchor',
  'formal smoke run without service process guard',
  'tmp evidence directory left unclassified',
  'player-visible UI accepted with engineering field leakage',
]) {
  assert.ok(template.deniedClaims.includes(deniedClaim), `template missing denied claim: ${deniedClaim}`)
}

const stage827 = JSON.parse(readUtf8(stage827ManifestPath)) as {
  requiredSurfaces?: Array<{ id: string; path?: string; requiredWhen: string }>
  stageTypePolicies?: Array<{ stageType: string; mustRegister: string[] }>
}
const templateSurface = stage827.requiredSurfaces?.find((item) => item.id === 'gameplay_anchor_evidence_template')
assert.ok(templateSurface, 'Stage 827 registration manifest must include gameplay_anchor_evidence_template surface')
assert.equal(templateSurface.path, templatePath)
assert.equal(templateSurface.requiredWhen, 'every gameplay-anchor stage')
const gameplayPolicy = stage827.stageTypePolicies?.find((item) => item.stageType === 'gameplay-anchor')
assert.ok(gameplayPolicy, 'Stage 827 registration manifest must include gameplay-anchor policy')
assert.ok(
  gameplayPolicy.mustRegister.includes('gameplay_anchor_evidence_template'),
  'gameplay-anchor policy must require the Stage 828 evidence template',
)

const stage826 = JSON.parse(readUtf8(stage826ManifestPath)) as {
  completedStages?: Array<{ stageId: number | string; status: string; evidence: string[] }>
  mandatoryGuards?: string[]
}
const stage828 = stage826.completedStages?.find((item) => item.stageId === 828)
assert.ok(stage828, 'Stage 826 convergence manifest must record Stage 828 completion')
assert.equal(stage828.status, 'formal-green')
assert.ok(stage828.evidence.includes(templatePath), 'Stage 828 evidence must include the gameplay anchor template')
assert.ok(
  stage826.mandatoryGuards?.includes('gameplay_anchor_evidence_template_guard'),
  'Stage 826 convergence manifest must list gameplay_anchor_evidence_template_guard as mandatory',
)

const doc = readUtf8(docPath)
for (const token of [
  'Stage 828',
  templatePath,
  'current Stage 828 gameplay anchor evidence template guard',
  'Godot visible surface',
  'server authority',
  'AI-read boundary',
  'tmp evidence retention',
  'does not start `server:dev`, `tsx watch`, Godot export, or a smoke backend',
]) {
  assertIncludes(doc, token, 'Stage 828 doc')
}

const current = readUtf8(currentPath)
assertIncludes(current, 'Stage 828 - Gameplay Anchor Evidence Template Guard', 'CURRENT handoff')
assertIncludes(current, templatePath, 'CURRENT handoff')

const megaPlan = readUtf8(megaPlanPath)
assertIncludes(megaPlan, 'Stage 828', 'mega plan')
assertIncludes(megaPlan, 'gameplay anchor evidence template guard', 'mega plan')

const splitTarget = readUtf8(splitTargetPath)
assertIncludes(splitTarget, 'Stage 828', 'split target')
assertIncludes(splitTarget, 'local-dev.gameplay-anchor-evidence-template.json', 'split target')

console.log('[gameplay_anchor_evidence_template_stage828_contract] all checks passed')
