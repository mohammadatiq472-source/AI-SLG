import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()

const mainSource = readFileSync(path.join(repoRoot, 'godot-client/scripts/app/main.gd'), 'utf8')
const visualSmokeSource = readFileSync(path.join(repoRoot, 'godot-client/tools/run_mainline_visual_smoke.py'), 'utf8')
const interceptDoc = readFileSync(
  path.join(repoRoot, 'docs/SEA_OVERSEAS_NAVAL_PATROL_INTERCEPT_SLICE_CURRENT_2026_06_07.md'),
  'utf8',
)

const clickAction = 'world_sea_patrol_intercept_report_fixture'

assert.ok(
  mainSource.includes(`"${clickAction}"`) &&
    mainSource.includes('func _press_mainline_visual_smoke_world_sea_patrol_intercept_report_fixture() -> Dictionary:'),
  'main.gd must expose a formal world_sea_patrol_intercept_report_fixture click action.',
)

assert.ok(
  mainSource.includes('"openSeaRoute"') &&
    mainSource.includes('"seaPatrolScout"') &&
    mainSource.includes('"seaPatrolIntercept"') &&
    mainSource.includes('"attackerVesselType": "interceptor_warship"') &&
    mainSource.includes('"defenderVesselType": "transport_warship"'),
  'Godot fixture must drive openSeaRoute -> seaPatrolScout -> seaPatrolIntercept with the W11 vessel types.',
)

assert.ok(
  mainSource.includes('worldSeaPatrolInterceptReportFixtureOk') &&
    mainSource.includes('worldSeaPatrolInterceptReportId') &&
    mainSource.includes('worldSeaPatrolInterceptListMaritimeChipVisibleCount') &&
    mainSource.includes('worldSeaPatrolInterceptDetailMaritimeChipId') &&
    mainSource.includes('worldSeaPatrolInterceptBattleReportSurface') &&
    mainSource.includes('worldSeaPatrolInterceptNavalBattleScope') &&
    mainSource.includes('worldSeaPatrolInterceptAttackerVesselType') &&
    mainSource.includes('worldSeaPatrolInterceptDefenderVesselType') &&
    mainSource.includes('sea_patrol_intercept_naval_frame_route_feedback_v1') &&
    mainSource.includes('w13_frame_batch_ready_route_feedback_preview_only'),
  'Godot fixture must summarize same-report list/detail maritime chips and expose W13 naval frame route feedback.',
)

assert.ok(
  visualSmokeSource.includes(`"${clickAction}"`) &&
    visualSmokeSource.includes('"worldSeaPatrolInterceptReportFixtureOk"') &&
    visualSmokeSource.includes('"worldSeaPatrolInterceptListMaritimeChipVisibleCount"') &&
    visualSmokeSource.includes('"worldSeaPatrolInterceptDetailMaritimeChipId"') &&
    visualSmokeSource.includes('"worldSeaPatrolInterceptShipImageBatchStatus"') &&
    visualSmokeSource.includes('"worldSeaPatrolInterceptNavalFrameRouteFeedbackOk"'),
  'run_mainline_visual_smoke.py must whitelist and require the sea patrol intercept fixture summary fields.',
)

assert.ok(
  interceptDoc.includes(clickAction) &&
    interceptDoc.includes('sea_patrol_intercept_naval_frame_route_feedback_v1') &&
    interceptDoc.includes('三类战船 80 帧'),
  'W11 current doc must record the W12 Godot fixture and the W13 naval frame route-feedback upgrade.',
)

console.log('[godot_sea_patrol_intercept_fixture_contract] all checks passed')
