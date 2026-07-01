import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const visualSmoke = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

assert.ok(
  main.includes('var chat_governance := _build_mainline_visual_smoke_player_visible_ui_governance_result({'),
  'shell_open_chat_channel_keep_open must feed the reusable player_visible_ui_governance_v1 helper.',
)

for (const requiredField of [
  'chatPlayerUiGovernanceContractId',
  'chatPlayerUiGovernanceVerified',
  'chatForbiddenVisibleCopyClear',
  'chatVisibleDensityOk',
]) {
  assert.ok(main.includes(requiredField), `chat smoke result must expose ${requiredField}.`)
  assert.ok(visualSmoke.includes(`"${requiredField}"`), `shell_open_chat_channel_keep_open runner must require ${requiredField}.`)
}

for (const forbiddenVisibleCopy of ['read model', 'authority', 'tier', 'child page', '结构化展示', '当前切项', 'provider', 'env', 'key', 'proposalId', 'worldAction', 'queuePlanExecution']) {
  assert.ok(
    main.includes(`"${forbiddenVisibleCopy}"`),
    `chat governance adapter must check forbidden visible copy: ${forbiddenVisibleCopy}`,
  )
}

console.log('[godot_chat_player_ui_governance_adapter_contract] all checks passed')
