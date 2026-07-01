import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}

const anchorDocPath = 'docs/GODOT_CLIENT_SERVER_INTERACTION_SMOKE_ANCHOR_CURRENT_2026_06_16.md'

assert.equal(
  packageJson.scripts?.['test:godot:client-server-interaction-smoke-anchor-contract'],
  'tsx server/tests/godot_client_server_interaction_smoke_anchor_contract.test.ts',
  'package.json must expose the Godot client/server interaction smoke anchor contract',
)

assert.ok(existsSync(anchorDocPath), `missing Godot client/server smoke anchor doc: ${anchorDocPath}`)

const anchorDoc = readFileSync(anchorDocPath, 'utf8')
assert.ok(
  anchorDoc.includes('Status: current Godot client/server interaction smoke anchor'),
  'anchor doc must identify itself as the current Godot client/server interaction smoke anchor',
)

const anchorMatch = anchorDoc.match(/```json\s*\n([\s\S]*?)\n```/)
assert.ok(anchorMatch, 'anchor doc must contain a machine-readable JSON block')

const anchor = JSON.parse(anchorMatch[1]) as {
  status: string
  stage: number
  anchorId: string
  clickAction: string
  playerVisibleSurface: string
  formalCommand: string
  ownership: {
    clientOwned: string[]
    serverOwned: string[]
    sharedContract: string[]
    aiRead: string[]
  }
  requiredSummaryFields: string[]
  requiredValidators: string[]
  serverContracts: string[]
  evidencePolicy: {
    summaryPath: string
    godotReportPath: string
    screenshotPath: string
    committedEvidence: boolean
  }
}

assert.equal(anchor.status, 'current Godot client/server interaction smoke anchor')
assert.equal(anchor.stage, 808)
assert.equal(anchor.anchorId, 'battle_report_seeded_open_detail')
assert.equal(anchor.clickAction, 'battle_report_seeded_open_detail')
assert.equal(anchor.playerVisibleSurface, 'battle_report_detail')
assert.equal(
  anchor.formalCommand,
  'npm.cmd run godot:mainline:visual-smoke -- --click-action battle_report_seeded_open_detail --window-width 1920 --window-height 1080 --isolated-backend-state --timeout-sec 260 --backend-timeout-sec 160 --evidence-dir tmp/stage808_battle_report_client_server_smoke',
)
assert.deepEqual(anchor.ownership.clientOwned, [
  'godot-client/scripts/app/main.gd',
  'godot-client/scripts/ui/battle_report_detail_page.gd',
  'godot-client/scripts/ui/battle_report_list_page.gd',
  'godot-client/scripts/ui/presenters/battle_report_presenter.gd',
])
assert.deepEqual(anchor.ownership.serverOwned, [
  'server/src/application/world/WorldService.ts',
  'server/src/routes/world.ts',
  'server/src/routes/playerHistory.ts',
])
assert.deepEqual(anchor.ownership.sharedContract, [
  'godot-client/tools/run_mainline_visual_smoke.py',
  'server/tests/battle_report_seeded_closure_http_contract.test.ts',
  'server/tests/battle_report_read_model_contract.test.ts',
])
assert.deepEqual(anchor.ownership.aiRead, [
  'AI may read battle report facts only through approved subject/read-model packets; the Godot smoke anchor is not an AI private sourceRef/provider/restore-token entry.',
])

for (const requiredField of [
  'battleReportDetailAiLivingFeedbackToken',
  'battleReportDetailAiLivingFeedbackVisible',
  'battleReportDetailAiActivityContinuityToken',
  'battleReportDetailAiActivityCarryingTroopsChipVisible',
  'battleReportDetailPlayerCopyOk',
  'visibleCopyForbiddenHits',
  'playerVisibleEngineeringCopyLeak',
  'sourceLabelVisible',
  'styleOwner',
]) {
  assert.ok(anchor.requiredSummaryFields.includes(requiredField), `anchor missing summary field: ${requiredField}`)
}

assert.deepEqual(anchor.requiredValidators, [
  '_validate_battle_report_detail_player_copy_governance',
])
assert.deepEqual(anchor.serverContracts, [
  'npm.cmd run test:world:battle-report-seeded-closure-contract',
  'npm.cmd run test:world:battle-report-real-data-owner-filter-contract',
  'npx.cmd tsx server/tests/battle_report_read_model_contract.test.ts',
])
assert.deepEqual(anchor.evidencePolicy, {
  summaryPath: 'tmp/stage808_battle_report_client_server_smoke/mainline_visual_smoke_summary.json',
  godotReportPath: 'tmp/stage808_battle_report_client_server_smoke/godot_visual_smoke_report.json',
  screenshotPath: 'tmp/stage808_battle_report_client_server_smoke/01_after_battle_report_seeded_open_detail.png',
  committedEvidence: false,
})

const visualSmokeSource = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf8')
for (const requiredVisualSmokeToken of [
  '"battle_report_seeded_open_detail"',
  'BATTLE_REPORT_SEEDED_CLOSURE_ACTIONS',
  '"battleReportDetailPlayerCopyOk"',
  '"visibleCopyForbiddenHits"',
  '"playerVisibleEngineeringCopyLeak"',
  '_validate_battle_report_detail_player_copy_governance',
]) {
  assert.ok(visualSmokeSource.includes(requiredVisualSmokeToken), `visual smoke missing token: ${requiredVisualSmokeToken}`)
}

const mainSource = readFileSync('godot-client/scripts/app/main.gd', 'utf8')
for (const requiredMainToken of [
  'func _press_mainline_visual_smoke_battle_report_open_detail_tab(',
  'battleReportDetailPlayerCopyOk',
  'visibleCopyForbiddenHits',
  'playerVisibleEngineeringCopyLeak',
  'sourceLabelVisible',
  'styleOwner',
]) {
  assert.ok(mainSource.includes(requiredMainToken), `main.gd missing smoke summary token: ${requiredMainToken}`)
}

const seededClosureContract = readFileSync('server/tests/battle_report_seeded_closure_http_contract.test.ts', 'utf8')
for (const requiredServerToken of [
  "action: 'seedBattleReportClosure'",
  'seededBattleReportPlayerOwnedCount',
  'seededBattleReportAiOwnedCount',
  'seededBattleReportOrganizationOwnedCount',
  '/api/player-history?limit=20&replayLimit=5&replayRequestId=',
]) {
  assert.ok(seededClosureContract.includes(requiredServerToken), `seeded battle report server contract missing: ${requiredServerToken}`)
}

const currentHandoff = readFileSync('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md', 'utf8')
for (const requiredHandoffToken of [
  'Stage 808 - Godot Battle Report Client/Server Interaction Smoke Anchor',
  'battle_report_seeded_open_detail',
  'tmp/stage808_battle_report_client_server_smoke/01_after_battle_report_seeded_open_detail.png',
]) {
  assert.ok(currentHandoff.includes(requiredHandoffToken), `CURRENT handoff missing Stage 808 token: ${requiredHandoffToken}`)
}

console.log('[godot_client_server_interaction_smoke_anchor_contract] all checks passed')
