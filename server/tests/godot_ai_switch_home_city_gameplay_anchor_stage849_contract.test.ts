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

function functionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const next = source.indexOf('\nfunc ', start + signature.length)
  return source.slice(start, next > start ? next : source.length)
}

function pythonFunctionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const next = source.indexOf('\ndef ', start + signature.length)
  return source.slice(start, next > start ? next : source.length)
}

const stage = 849
const anchorDocPath = 'docs/GODOT_AI_SWITCH_HOME_CITY_GAMEPLAY_ANCHOR_CURRENT_2026_06_18.md'
const registryPath = 'ops/release-artifacts/local-dev.gameplay-anchor-registry.json'
const stage826Path = 'ops/release-artifacts/local-dev.boundary-convergence-progress.json'
const tmpRetentionPath = 'ops/release-artifacts/local-dev.tmp-evidence-retention.json'
const currentPath = 'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md'
const splitTargetPath = 'docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md'
const megaPlanPath = 'docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md'
const clickAction = 'world_ai_switch_open_home_city'
const evidenceDirectory = 'tmp/stage849_ai_switch_home_city_gameplay_anchor'
const formalCommand =
  'npm.cmd run godot:mainline:visual-smoke -- --display-mode world --click-action world_ai_switch_open_home_city --window-width 1920 --window-height 1080 --isolated-backend-state --timeout-sec 260 --backend-timeout-sec 160 --evidence-dir tmp/stage849_ai_switch_home_city_gameplay_anchor'

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}
assert.equal(
  packageJson.scripts?.['test:godot:ai-switch-home-city-gameplay-anchor-stage849-contract'],
  'tsx server/tests/godot_ai_switch_home_city_gameplay_anchor_stage849_contract.test.ts',
  'package.json must expose the Stage 849 AI switch home-city gameplay anchor contract',
)

assert.ok(existsSync(anchorDocPath), `missing Stage 849 AI switch home-city gameplay anchor doc: ${anchorDocPath}`)
const anchorDoc = readUtf8(anchorDocPath)
assertIncludes(anchorDoc, 'Status: current Godot AI switch home-city gameplay anchor', 'anchor doc status')
assertIncludes(anchorDoc, 'Stage 849', 'anchor doc stage marker')
assertIncludes(anchorDoc, 'readonly AI main-city facility tree', 'anchor doc player-visible surface')
assertIncludes(anchorDoc, 'server facility-entry read model owns truth', 'anchor doc server authority boundary')

const anchor = extractJsonBlock(anchorDoc)
assert.equal(anchor.status, 'current Godot AI switch home-city gameplay anchor')
assert.equal(anchor.stage, stage)
assert.equal(anchor.anchorId, clickAction)
assert.equal(anchor.clickAction, clickAction)
assert.equal(anchor.playerVisibleSurface, 'ai_switch_readonly_home_city_facility_tree')
assert.equal(anchor.formalCommand, formalCommand)
assert.equal(anchor.serverAuthority.registerAiPlayerRoute, 'POST /api/ai/players')
assert.equal(anchor.serverAuthority.homeCityCandidatesRoute, 'GET /api/ai/players/:aiPlayerId/home-city/candidates')
assert.equal(anchor.serverAuthority.homeCityBindRoute, 'POST /api/ai/players/:aiPlayerId/home-city')
assert.equal(anchor.serverAuthority.facilityEntryRoute, 'GET /api/world/main-city/facility-entry?asAiPlayerId=<ai>&governorPlayerId=<human>')
assert.equal(anchor.boundary.clientVisibleCacheIsTruth, false)
assert.equal(anchor.boundary.serverFacilityEntryIsTruth, true)
assert.equal(anchor.boundary.aiReadsGodotCache, false)
assert.equal(anchor.boundary.facilityTreeReadonlyRequired, true)
assert.equal(anchor.boundary.facilityTreeDataSourceRequired, 'read_model')
assert.equal(anchor.boundary.mainCityFacilitySourceRequired, 'ai_home_city_facility_entry')

for (const clientFile of [
  'godot-client/scripts/app/main.gd',
  'godot-client/scripts/ui/native_slg_shell.gd',
  'godot-client/scripts/app/adapters/slg_domain_action_adapter.gd',
]) {
  assert.ok(anchor.ownership.clientOwned.includes(clientFile), `anchor client ownership must include ${clientFile}`)
}

for (const serverFile of [
  'server/src/application/ai/AIPlayerGovernanceService.ts',
  'server/src/application/world/mainCityFacilityEntryReadModel.ts',
  'server/src/routes/world.ts',
]) {
  assert.ok(anchor.ownership.serverOwned.includes(serverFile), `anchor server ownership must include ${serverFile}`)
}

for (const contractFile of [
  'godot-client/tools/run_mainline_visual_smoke.py',
  'server/tests/godot_ai_switch_home_city_visual_acceptance_contract.test.ts',
  'server/tests/ai_player_home_city_binding_contract.test.ts',
  'server/tests/main_city_facility_entry_read_model_http_contract.test.ts',
]) {
  assert.ok(anchor.ownership.sharedContract.includes(contractFile), `anchor shared contract must include ${contractFile}`)
}

for (const requiredAiReadBoundary of [
  'AI may read approved AI home-city and facility-entry summaries only',
  'no Godot cache authority',
  'no private sourceRefs',
  'no provider key',
  'no restore token',
  'no persistence path',
  'no server-only fixture',
]) {
  assert.ok(anchor.ownership.aiRead.includes(requiredAiReadBoundary), `anchor AI-read boundary must include ${requiredAiReadBoundary}`)
}

for (const requiredGodotField of [
  'aiSwitchHomeCityVisualAcceptanceToken',
  'aiSwitchHomeCityScreenshotAcceptanceReady',
  'aiSwitchHomeCityVisibleCopyClean',
  'aiSwitchHomeCityStyleOwner',
  'aiSwitchOneClickFacilityOpenOk',
  'aiSwitchOneClickButtonVisible',
  'aiSwitchOneClickShellContractOk',
  'facilityTreeReadonly',
  'facilityTreeDataSource',
  'mainCityFacilitySource',
]) {
  assert.ok(anchor.requiredGodotFields.includes(requiredGodotField), `anchor Godot fields must include ${requiredGodotField}`)
}

assert.deepEqual(anchor.evidence, {
  summaryPath: `${evidenceDirectory}/mainline_visual_smoke_summary.json`,
  godotReportPath: `${evidenceDirectory}/godot_visual_smoke_report.json`,
  screenshotPath: `${evidenceDirectory}/01_after_world_ai_switch_open_home_city.png`,
})

for (const command of [
  'npm.cmd run ops:service-process-guard',
  'npm.cmd run test:godot:ai-switch-home-city-gameplay-anchor-stage849-contract',
  'npx.cmd tsx server/tests/godot_ai_switch_home_city_visual_acceptance_contract.test.ts',
  'npm.cmd run test:ai:player-home-city-binding-contract',
  'npx.cmd tsx server/tests/main_city_facility_entry_read_model_http_contract.test.ts',
  formalCommand,
  'npm.cmd run test:gameplay-anchor-registry-stage829-contract',
  'npm.cmd run ops:tmp-evidence-retention:check',
]) {
  assert.ok(anchor.formalVerification.includes(command), `anchor formal verification must include ${command}`)
}

const mainSource = readUtf8('godot-client/scripts/app/main.gd')
assertIncludes(mainSource, `"${clickAction}":`, 'Godot AI switch click action dispatch')
const actionSource = functionSource(mainSource, 'func _press_mainline_visual_smoke_ai_switch_open_home_city() -> Dictionary:')
for (const requiredMainToken of [
  'AiSwitchButton',
  'aiSwitchHomeCityVisualAcceptanceToken',
  'aiSwitchHomeCityScreenshotAcceptanceReady',
  'aiSwitchHomeCityVisibleCopyClean',
  'aiSwitchHomeCityStyleOwner',
  'aiSwitchOneClickFacilityOpenOk',
  'facilityTreeReadonly',
  'ai_home_city_facility_entry',
]) {
  assertIncludes(actionSource, requiredMainToken, 'Godot AI switch action wrapper')
}
assertIncludes(mainSource, '"facilityTreeDataSource": "read_model"', 'Godot facility tree page summary')
for (const forbiddenVisibleCopy of ['read model', 'authority', 'tier', 'backend', 'contract id', 'fixture', 'debug', 'snake_case']) {
  assertNotIncludes('AI切换', forbiddenVisibleCopy, 'AI switch visible button copy')
}

const adapterSource = readUtf8('godot-client/scripts/app/adapters/slg_domain_action_adapter.gd')
for (const requiredAdapterToken of [
  'request_ai_player_runtime_refresh',
  'request_ai_player_home_city_open',
  'get_main_city_facility_entry',
  '_store_ai_player_main_city_facility_entry',
  'governorPlayerId',
]) {
  assertIncludes(adapterSource, requiredAdapterToken, 'Godot AI switch adapter')
}

const shellSource = readUtf8('godot-client/scripts/ui/native_slg_shell.gd')
assertIncludes(shellSource, '_bind_action_button(existing_button, "ai_switch_home_city")', 'native shell AI switch button')
assertIncludes(shellSource, '_ai_switch_button.text = "AI切换"', 'native shell AI switch visible copy')

const visualSmoke = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')
const runnerValidator = pythonFunctionSource(visualSmoke, 'def _validate_ai_switch_home_city_visual_acceptance_contract(')
for (const requiredRunnerToken of [
  `"${clickAction}"`,
  'def _seed_ai_home_city_bound_fixture',
  'POST", "/api/session/join"',
  'POST", "/api/ai/players"',
  'home-city/candidates',
  'home-city"',
  '/api/world/main-city/facility-entry',
  'seed_ai_home_city_bound_fixture',
  'aiSwitchHomeCityScreenshotAcceptanceReady',
  'aiSwitchOneClickFacilityOpenOk',
]) {
  assertIncludes(visualSmoke, requiredRunnerToken, 'Godot visual smoke AI switch runner')
}
for (const requiredValidatorToken of [
  'screenshot_visibility_gate.get("ok", False)',
  'aiSwitchHomeCityVisualAcceptanceToken',
  'aiSwitchHomeCityScreenshotAcceptanceReady',
  'aiSwitchHomeCityVisibleCopyClean',
  'aiSwitchOneClickFacilityOpenOk',
]) {
  assertIncludes(runnerValidator, requiredValidatorToken, 'AI switch visual-smoke validator')
}

const bindingContract = readUtf8('server/tests/ai_player_home_city_binding_contract.test.ts')
for (const requiredServerToken of [
  '/api/ai/players/home_city_alpha/home-city/candidates?governorPlayerId=human_alpha',
  '/api/ai/players/home_city_alpha/home-city',
  '/api/world/main-city/facility-entry?asAiPlayerId=home_city_alpha&governorPlayerId=human_alpha',
  "ownerKind, 'ai'",
  'readonly, true',
]) {
  assertIncludes(bindingContract, requiredServerToken, 'server AI home-city binding contract')
}

const facilityEntryContract = readUtf8('server/tests/main_city_facility_entry_read_model_http_contract.test.ts')
for (const requiredFacilityEntryToken of [
  'main_city_facility_entry_read_model_v1',
  'asAiPlayerId=facility_observer_alpha',
  "ownerKind, 'ai'",
  'readonly, true',
]) {
  assertIncludes(facilityEntryContract, requiredFacilityEntryToken, 'server facility-entry read model contract')
}

const registry = JSON.parse(readUtf8(registryPath)) as { registeredAnchors?: any[] }
const registered = registry.registeredAnchors?.find((item) => item.stageId === stage)
assert.ok(registered, 'gameplay anchor registry must include Stage 849')
assert.equal(registered.anchorId, clickAction)
assert.equal(registered.anchorClass, 'formal-gameplay-anchor')
assert.equal(registered.status, 'formal-green')
assert.equal(registered.clientInputOrClickAction, clickAction)
assert.equal(registered.evidenceDirectory, evidenceDirectory)
assert.equal(registered.summaryJsonPath, `${evidenceDirectory}/mainline_visual_smoke_summary.json`)
assert.equal(registered.godotReportJsonPath, `${evidenceDirectory}/godot_visual_smoke_report.json`)
assert.equal(registered.screenshotEvidencePath, `${evidenceDirectory}/01_after_world_ai_switch_open_home_city.png`)
assert.equal(registered.tmpEvidenceRetentionClassification, 'formal-gameplay-anchor-evidence')
assertIncludes(registered.serverAuthorityRouteOrProducer, 'AI home-city bind and facility-entry read model', 'Stage 849 registry')
assertIncludes(registered.nonClaims.join('\n'), 'not an AI direct-control or automation proof', 'Stage 849 registry non-claim')

const stage826 = JSON.parse(readUtf8(stage826Path)) as {
  completedStages?: Array<{ stageId: number | string; status: string; evidence: string[] }>
  gameplayAnchors?: Array<{ stageId: number | string; anchorId: string; smokeEvidence: string }>
}
const completedStage = stage826.completedStages?.find((item) => item.stageId === stage)
assert.ok(completedStage, 'Stage 826 convergence manifest must record Stage 849')
assert.equal(completedStage.status, 'formal-green')
assert.ok(completedStage.evidence.includes(anchorDocPath), 'Stage 849 evidence must include the anchor doc')
assert.ok(completedStage.evidence.includes('server/tests/godot_ai_switch_home_city_gameplay_anchor_stage849_contract.test.ts'))
const stage826Anchor = stage826.gameplayAnchors?.find((item) => item.stageId === stage)
assert.ok(stage826Anchor, 'Stage 826 gameplay anchors must include Stage 849')
assert.equal(stage826Anchor.anchorId, clickAction)
assert.equal(stage826Anchor.smokeEvidence, `${evidenceDirectory}/`)

const tmpRetention = JSON.parse(readUtf8(tmpRetentionPath)) as { retainedEvidence?: any[] }
const retained = tmpRetention.retainedEvidence?.find((item) => item.stage === stage)
assert.ok(retained, 'tmp evidence retention manifest must retain Stage 849 formal evidence')
assert.equal(retained.path, evidenceDirectory)
assert.equal(retained.retentionClass, 'formal-gameplay-anchor-evidence')
assert.equal(retained.currentHandoffReference, 'Stage 849 - AI switch home-city gameplay anchor')
assert.equal(retained.deletionRequiresExplicitUserApproval, true)

for (const [path, label] of [
  [currentPath, 'CURRENT handoff'],
  [splitTargetPath, 'split target'],
  [megaPlanPath, 'mega plan'],
] as const) {
  const source = readUtf8(path)
  assertIncludes(source, 'Stage 849', label)
  assertIncludes(source, clickAction, label)
  assertIncludes(source, formalCommand, label)
  assertIncludes(source, 'readonly AI main-city facility tree', label)
}

console.log('[godot_ai_switch_home_city_gameplay_anchor_stage849_contract] all checks passed')
