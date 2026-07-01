import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

function assertNotIncludes(source: string, token: string, label: string): void {
  assert.ok(!source.includes(token), `${label} must not include ${token}`)
}

function extractJsonBlock(source: string): any {
  const match = source.match(/```json\s*([\s\S]*?)```/)
  assert.ok(match, 'anchor doc must include one fenced json block')
  return JSON.parse(match[1])
}

const stage = 851
const anchorDocPath = 'docs/GODOT_MAIN_CITY_INTERIOR_TAX_READONLY_GAMEPLAY_ANCHOR_CURRENT_2026_06_18.md'
const registryPath = 'ops/release-artifacts/local-dev.gameplay-anchor-registry.json'
const stage826Path = 'ops/release-artifacts/local-dev.boundary-convergence-progress.json'
const tmpRetentionPath = 'ops/release-artifacts/local-dev.tmp-evidence-retention.json'
const currentPath = 'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md'
const splitTargetPath = 'docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md'
const megaPlanPath = 'docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md'
const clickAction = 'world_open_main_city_interior_tax'
const evidenceDirectory = 'tmp/stage851_main_city_interior_tax_gameplay_anchor'
const formalCommand =
  'npm.cmd run godot:mainline:visual-smoke -- --window-width 1920 --window-height 1080 --click-action world_open_main_city_interior_tax --isolated-backend-state --timeout-sec 320 --backend-timeout-sec 200 --evidence-dir tmp/stage851_main_city_interior_tax_gameplay_anchor'

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['test:godot:main-city-interior-tax-readonly-gameplay-anchor-stage851-contract'],
  'tsx server/tests/godot_main_city_interior_tax_readonly_gameplay_anchor_stage851_contract.test.ts',
  'package.json must expose the Stage 851 main-city interior tax readonly gameplay anchor contract',
)

assert.ok(existsSync(anchorDocPath), `missing Stage 851 tax readonly gameplay anchor doc: ${anchorDocPath}`)
const anchorDoc = readUtf8(anchorDocPath)
assertIncludes(anchorDoc, 'Status: current Godot main-city interior tax readonly gameplay anchor', 'anchor doc status')
assertIncludes(anchorDoc, 'Stage 851', 'anchor doc stage marker')
assertIncludes(anchorDoc, 'readonly gameplay anchor', 'anchor doc readonly boundary')
assertIncludes(anchorDoc, 'does not claim a tax-collection mutation', 'anchor doc non-claim')

const anchor = extractJsonBlock(anchorDoc)
assert.equal(anchor.status, 'current Godot main-city interior tax readonly gameplay anchor')
assert.equal(anchor.stage, stage)
assert.equal(anchor.anchorId, clickAction)
assert.equal(anchor.clickAction, clickAction)
assert.equal(anchor.playerVisibleSurface, 'main_city_interior_tax_treasury_page')
assert.equal(anchor.formalCommand, formalCommand)
assert.equal(anchor.serverAuthority.readModelRoute, 'GET /api/world/main-city/interior?playerId=<player>&cityStateId=<city>&cityLabel=<label>')
assert.equal(anchor.serverAuthority.readModelProducer, 'server/src/application/world/mainCityInteriorReadModel.ts')
assert.equal(anchor.boundary.clientVisibleCacheIsTruth, false)
assert.equal(anchor.boundary.serverInteriorReadModelIsTruth, true)
assert.equal(anchor.boundary.taxMutationClaimed, false)
assert.equal(anchor.boundary.readonlyRequired, true)
assert.equal(anchor.boundary.scheduleCadenceRequired, 'six_daily_slots_06_21_v1')
assert.equal(anchor.boundary.timelineCompactModeRequired, 'six_slots_compact_fit_v1')

for (const requiredGodotField of [
  'interiorSecondaryCardChromeToken',
  'interiorTaxTreasuryLayoutPriorityToken',
  'interiorTaxTreasuryHeroLayoutMode',
  'interiorTaxTreasuryTimelineVerticalMode',
  'interiorTaxTreasuryHeroPanelVerticalMode',
  'interiorTaxTreasuryPrimaryNodeRole',
  'interiorTaxTreasuryTopVoidGuard',
  'interiorTaxTreasuryScheduleCadence',
  'interiorTaxTreasuryTimelineCompactMode',
  'interiorTaxTreasuryScheduleSlotCount',
  'interiorTaxTreasuryTimelineNodeCount',
]) {
  assert.ok(anchor.requiredGodotFields.includes(requiredGodotField), `anchor Godot fields must include ${requiredGodotField}`)
}

assert.deepEqual(anchor.evidence, {
  summaryPath: `${evidenceDirectory}/mainline_visual_smoke_summary.json`,
  godotReportPath: `${evidenceDirectory}/godot_visual_smoke_report.json`,
  screenshotPath: `${evidenceDirectory}/01_after_world_open_main_city_interior_tax.png`,
})

for (const command of [
  'npm.cmd run ops:service-process-guard',
  'npm.cmd run test:godot:main-city-interior-tax-readonly-gameplay-anchor-stage851-contract',
  'npm.cmd run test:world:main-city-interior-read-model-contract',
  'npx.cmd tsx server/tests/main_city_interior_tax_six_slot_schedule_contract.test.ts',
  'npx.cmd tsx server/tests/godot_main_city_interior_tax_layout_priority_contract.test.ts',
  'npx.cmd tsx server/tests/godot_main_city_interior_secondary_card_chrome_contract.test.ts',
  formalCommand,
  'npm.cmd run test:gameplay-anchor-registry-stage829-contract',
  'npm.cmd run ops:tmp-evidence-retention:check',
]) {
  assert.ok(anchor.formalVerification.includes(command), `anchor formal verification must include ${command}`)
}

const mainSource = readUtf8('godot-client/scripts/app/main.gd')
assertIncludes(mainSource, `"${clickAction}":`, 'Godot tax click action dispatch')
assertIncludes(
  mainSource,
  '_press_mainline_visual_smoke_main_city_overlay_panel_page_open("interior", "tax/structure")',
  'Godot tax click action must open the interior tax page',
)

const interiorPanelSource = readUtf8('godot-client/scripts/ui/interior_panel.gd')
for (const requiredInteriorToken of [
  'INTERIOR_TAX_TREASURY_LAYOUT_PRIORITY_TOKEN',
  '"interiorTaxTreasuryScheduleCadence"] = "six_daily_slots_06_21_v1"',
  '"interiorTaxTreasuryTimelineCompactMode"] = "six_slots_compact_fit_v1"',
  '"interiorTaxTreasuryPrimaryNodeRole"] = "primary_collect_center"',
]) {
  assertIncludes(interiorPanelSource, requiredInteriorToken, 'InteriorPanel tax treasury summary')
}
for (const forbiddenVisibleCopy of ['read model', 'authority', 'fixture', 'contract id', 'snake_case']) {
  assertNotIncludes('税收 晨课 早课 午课 申课 酉课 夜课', forbiddenVisibleCopy, 'tax visible copy sample')
}

const visualSmoke = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')
for (const requiredRunnerToken of [
  `"${clickAction}"`,
  '"interiorTaxTreasuryLayoutPriorityToken"',
  '"interiorTaxTreasuryScheduleCadence"',
  '"interiorTaxTreasuryTimelineCompactMode"',
]) {
  assertIncludes(visualSmoke, requiredRunnerToken, 'Godot visual smoke tax runner')
}

const readModelContract = readUtf8('server/tests/main_city_interior_read_model_http_contract.test.ts')
for (const requiredServerToken of [
  '/api/world/main-city/interior?playerId=player_alpha',
  'main_city_interior_read_model_v1',
  'tax_schedule_runtime_v1',
  'schedule_slots',
]) {
  assertIncludes(readModelContract, requiredServerToken, 'server interior read-model contract')
}

const taxScheduleContract = readUtf8('server/tests/main_city_interior_tax_six_slot_schedule_contract.test.ts')
for (const requiredTaxToken of [
  'six daily tax collection slots',
  'collectable_now',
  'six_daily_slots_06_21_v1',
  'six_slots_compact_fit_v1',
]) {
  assertIncludes(taxScheduleContract, requiredTaxToken, 'server tax schedule contract')
}

const registry = JSON.parse(readUtf8(registryPath)) as { registeredAnchors?: any[] }
const registered = registry.registeredAnchors?.find((item) => item.stageId === stage)
assert.ok(registered, 'gameplay anchor registry must include Stage 851')
assert.equal(registered.anchorId, clickAction)
assert.equal(registered.anchorClass, 'formal-gameplay-anchor')
assert.equal(registered.status, 'formal-green-readonly')
assert.equal(registered.clientInputOrClickAction, clickAction)
assert.equal(registered.evidenceDirectory, evidenceDirectory)
assert.equal(registered.summaryJsonPath, `${evidenceDirectory}/mainline_visual_smoke_summary.json`)
assert.equal(registered.godotReportJsonPath, `${evidenceDirectory}/godot_visual_smoke_report.json`)
assert.equal(registered.screenshotEvidencePath, `${evidenceDirectory}/01_after_world_open_main_city_interior_tax.png`)
assert.equal(registered.tmpEvidenceRetentionClassification, 'formal-gameplay-anchor-evidence')
assertIncludes(registered.serverAuthorityRouteOrProducer, 'main-city interior read model', 'Stage 851 registry')
assertIncludes(registered.nonClaims.join('\n'), 'not a tax-collection mutation proof', 'Stage 851 registry non-claim')

const stage826 = JSON.parse(readUtf8(stage826Path)) as {
  completedStages?: Array<{ stageId: number | string; status: string; evidence: string[] }>
  gameplayAnchors?: Array<{ stageId: number | string; anchorId: string; smokeEvidence: string }>
}
const completedStage = stage826.completedStages?.find((item) => item.stageId === stage)
assert.ok(completedStage, 'Stage 826 convergence manifest must record Stage 851')
assert.equal(completedStage.status, 'formal-green-readonly')
assert.ok(completedStage.evidence.includes(anchorDocPath), 'Stage 851 evidence must include the anchor doc')
assert.ok(completedStage.evidence.includes('server/tests/godot_main_city_interior_tax_readonly_gameplay_anchor_stage851_contract.test.ts'))
const stage826Anchor = stage826.gameplayAnchors?.find((item) => item.stageId === stage)
assert.ok(stage826Anchor, 'Stage 826 gameplay anchors must include Stage 851')
assert.equal(stage826Anchor.anchorId, clickAction)
assert.equal(stage826Anchor.smokeEvidence, `${evidenceDirectory}/`)

const tmpRetention = JSON.parse(readUtf8(tmpRetentionPath)) as { retainedEvidence?: any[] }
const retained = tmpRetention.retainedEvidence?.find((item) => item.stage === stage)
assert.ok(retained, 'tmp evidence retention manifest must retain Stage 851 formal evidence')
assert.equal(retained.path, evidenceDirectory)
assert.equal(retained.retentionClass, 'formal-gameplay-anchor-evidence')
assert.equal(retained.currentHandoffReference, 'Stage 851 - main-city interior tax readonly gameplay anchor')
assert.equal(retained.deletionRequiresExplicitUserApproval, true)

for (const [path, label] of [
  [currentPath, 'CURRENT handoff'],
  [splitTargetPath, 'split target'],
  [megaPlanPath, 'mega plan'],
] as const) {
  const source = readUtf8(path)
  assertIncludes(source, 'Stage 851', label)
  assertIncludes(source, clickAction, label)
  assertIncludes(source, formalCommand, label)
  assertIncludes(source, 'readonly', label)
}

console.log('[godot_main_city_interior_tax_readonly_gameplay_anchor_stage851_contract] all checks passed')
