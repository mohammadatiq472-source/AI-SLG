import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const visualSmoke = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')
const worldEventActivityPanel = readFileSync('godot-client/scripts/ui/world_event_activity_panel.gd', 'utf-8')

const action = 'first_hour_land_loop_task_claim_prompt_gate'
const targetTaskId = 'huangtian_task_02_prepare_supplies'

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

assertIncludes(worldEventActivityPanel, 'action_id.begins_with("task_claim:")', 'tasks panel must route task_claim actions.')
assertIncludes(worldEventActivityPanel, 'claimTaskReward', 'tasks panel must use the real backend task claim action.')

assertIncludes(main, `"${action}"`, 'main.gd must route the first-hour task claim prompt gate action.')
assertIncludes(visualSmoke, `"${action}"`, 'visual smoke runner must whitelist the first-hour task claim prompt gate action.')
assertIncludes(
  visualSmoke,
  '--seed-first-hour-task-claim-prompt-fixture',
  'runner must expose a narrow seed for the first-hour task claim prompt acceptance.',
)
assertIncludes(
  visualSmoke,
  '_seed_first_hour_task_claim_prompt_fixture',
  'runner must seed task01 as claimed before the task02 claim prompt smoke.',
)
assertIncludes(
  visualSmoke,
  'seed_first_hour_task_claim_prompt_fixture',
  'runner must execute the first-hour claim prompt seed before Godot starts.',
)
assertIncludes(
  visualSmoke,
  '"taskId": "huangtian_task_02_prepare_supplies"',
  'runner seed must make task02 claimable without claiming it.',
)

const body = functionBody(main, '_press_mainline_visual_smoke_first_hour_task_claim_prompt_gate')
assert.ok(
  !body.includes('_press_mainline_visual_smoke_first_hour_land_loop_integrated_click_to_task_readback_gate'),
  'claim prompt gate must not pre-consume the task claim by running the full land-loop gate first.',
)
assertIncludes(body, '_open_overlay_panel_with_page("tasks", "tasks")', 'claim prompt gate must open the real tasks panel.')
assertIncludes(body, 'Button', 'claim prompt gate must interact with a real Godot Button.')
assertIncludes(body, 'emit_signal("pressed")', 'claim prompt gate must press the task claim Button, not only set summary fields.')
assertIncludes(body, targetTaskId, 'claim prompt gate must target the accepted first-hour resource task.')
assertIncludes(body, '_read_first_hour_task_claim_prompt_state', 'claim prompt gate must read prompt state through the formal helper.')
assertIncludes(main, '_read_world_tasks_model_for_smoke', 'claim prompt state helper must read world tasks through the formal helper.')
assertIncludes(main, 'request_json("GET", "/api/world/tasks"', 'claim prompt helper must read world tasks after claim.')
assertIncludes(body, 'get_current_goals', 'claim prompt gate must read current goals after claim without mutating them.')
assertIncludes(body, '_sum_task_reward_preview_resources', 'claim prompt gate must derive expected resources from the task reward preview.')
assertIncludes(body, '_read_target_faction_resource_snapshot_for_smoke', 'claim prompt gate must read faction resources before and after claim.')
assertIncludes(body, '_task_claim_reward_resources_applied', 'claim prompt gate must verify claimed task rewards settle into faction resources.')
assertIncludes(body, '_find_next_first_hour_task_after_claim', 'claim prompt gate must identify the next task after claiming the first-hour resource task.')
assertIncludes(body, '_task_has_next_action_guidance', 'claim prompt gate must verify the next task carries actionable guidance.')

for (const field of [
  'firstHourTaskClaimPromptVisible',
  'firstHourTaskClaimPromptOk',
  'taskId',
  'claimState',
  'taskClaimButtonVisible',
  'taskClaimButtonPressed',
  'taskClaimAfterState',
  'taskClaimFeedbackVisible',
  'currentGoalsReadModelOnly',
  'taskClaimVisibleCopyForbiddenHits',
  'taskClaimRewardPreviewResources',
  'taskClaimResourceBefore',
  'taskClaimResourceAfter',
  'taskClaimResourceDelta',
  'taskClaimRewardResourcesAppliedOk',
  'nextTaskAfterClaim',
  'nextTaskAfterClaimVisible',
  'nextTaskAfterClaimVisibleHits',
  'nextTaskAfterClaimGuidanceOk',
  'nextTaskAfterClaimId',
  'nextTaskAfterClaimTitle',
  'nextTaskAfterClaimActionHint',
  'nextTaskAfterClaimActionTarget',
  'resourceOccupationTaskProgressStillOk',
]) {
  assertIncludes(main, field, `Godot task claim prompt summary must expose ${field}.`)
  assertIncludes(visualSmoke, field, `visual smoke runner must require ${field}.`)
}

assertIncludes(
  visualSmoke,
  '_validate_first_hour_task_claim_prompt_contract',
  'runner must fail if the player-visible task claim prompt is missing.',
)
assertIncludes(
  visualSmoke,
  'taskClaimVisibleCopyForbiddenHits not empty',
  'runner must fail on task claim prompt engineering-copy leaks.',
)
assertIncludes(
  visualSmoke,
  'taskClaimRewardResourcesAppliedOk',
  'runner must fail if claimed task rewards do not settle into faction resources.',
)
assertIncludes(
  visualSmoke,
  'nextTaskAfterClaimGuidanceOk',
  'runner must fail if the next task after claim is missing actionable guidance.',
)

console.log('[godot_first_hour_task_claim_prompt_contract] all checks passed')
