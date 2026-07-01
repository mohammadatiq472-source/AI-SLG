import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const visualSmoke = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')
const backendClient = readFileSync('godot-client/scripts/infra/http/backend_api_client.gd', 'utf-8')

function assertIncludes(source: string, needle: string, message: string) {
  assert.ok(source.includes(needle), message)
}

function functionBody(source: string, name: string) {
  const marker = `func ${name}`
  const start = source.indexOf(marker)
  assert.ok(start >= 0, `missing ${name}`)
  const next = source.indexOf('\nfunc ', start + marker.length)
  return source.slice(start, next >= 0 ? next : source.length)
}

const action = 'first_hour_land_loop_integrated_click_to_task_readback_gate'

assertIncludes(main, `"${action}"`, 'main.gd must route the first-hour integrated land-loop gate action.')
assertIncludes(visualSmoke, `"${action}"`, 'visual smoke runner must whitelist the first-hour integrated land-loop gate action.')
assertIncludes(backendClient, 'func get_current_goals', 'Godot API client must expose current-goals readback.')
assertIncludes(`${main}\n${backendClient}`, 'request_json("GET", "/api/world/tasks"', 'Godot API client or direct request path must support world task readback.')

const body = functionBody(main, '_press_mainline_visual_smoke_first_hour_land_loop_integrated_click_to_task_readback_gate')

assertIncludes(
  body,
  '_press_mainline_visual_smoke_world_tile_expedition_production_resource_settlement_fixture',
  'integrated gate must reuse the accepted production resource expedition action instead of creating a fake UI path.',
)
assertIncludes(body, 'request_json("GET", "/api/world/tasks"', 'integrated gate must read back world tasks after expedition.')
assertIncludes(body, 'get_current_goals', 'integrated gate must read back current goals after expedition.')

for (const field of [
  'firstHourLandLoopIntegratedClickToTaskReadbackOk',
  'firstHourLandLoopIntegratedScope',
  'godotResourceHudExpeditionActionOk',
  'backendReceiptReadbackOk',
  'resourceReadbackOk',
  'battleRecordReadbackOk',
  'taskReadbackStatus',
  'taskReadbackOk',
  'taskProgressAutoAdvanced',
  'taskProgressAutoAdvanceBlocked',
  'currentGoalsReadbackOk',
  'currentGoalsReadModelOnly',
  'stage195BackendPersistenceGateReferenced',
  'netResourceDelta',
  'expectedNetResourceDelta',
  'settlementReceiptId',
  'battleReportId',
  'resourceDelta',
  'playerVisibleEngineeringCopyLeak',
  'visibleCopyForbiddenHits',
]) {
  assertIncludes(main, field, `Godot integrated gate summary must expose ${field}.`)
  assertIncludes(visualSmoke, field, `visual smoke runner must require ${field}.`)
}

assertIncludes(
  main,
  'taskProgressAutoAdvanced',
  'integrated gate must explicitly mark task auto-advance when resource expedition completes task progress.',
)
assertIncludes(
  visualSmoke,
  'taskProgressAutoAdvanced!=true',
  'runner must fail if task progress is not advanced by the resource expedition binding.',
)
assertIncludes(
  visualSmoke,
  'taskProgressAutoAdvanceBlocked!=false',
  'runner must fail if the old task auto-advance blocker remains true.',
)
assertIncludes(
  visualSmoke,
  'firstHourLandLoopIntegratedClickToTaskReadbackOk!=true',
  'runner must validate the integrated gate ok field.',
)

console.log('[godot_first_hour_land_loop_integrated_click_to_task_readback_contract] all checks passed')
