import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const visualSmoke = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

assert.ok(
  main.includes('var ai_activity_governance := _build_mainline_visual_smoke_player_visible_ui_governance_result({'),
  'world_ai_living_activity_layer_fixture must feed the reusable player_visible_ui_governance_v1 helper.',
)

for (const requiredField of [
  'aiActivityPlayerUiGovernanceContractId',
  'aiActivityPlayerUiGovernanceVerified',
  'aiActivityForbiddenVisibleCopyClear',
  'aiActivityVisibleDensityOk',
]) {
  assert.ok(main.includes(requiredField), `AI activity smoke result must expose ${requiredField}.`)
  assert.ok(visualSmoke.includes(`"${requiredField}"`), `world_ai_living_activity_layer_fixture runner must require ${requiredField}.`)
}

for (const forbiddenVisibleCopy of ['read model', 'authority', 'tier', 'child page', '结构化展示', '当前切项', 'proposalId', 'worldAction', 'queuePlanExecution']) {
  assert.ok(
    main.includes(`"${forbiddenVisibleCopy}"`),
    `AI activity governance adapter must check forbidden visible copy: ${forbiddenVisibleCopy}`,
  )
}

console.log('[godot_ai_activity_player_ui_governance_adapter_contract] all checks passed')
