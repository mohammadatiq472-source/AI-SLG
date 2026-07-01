import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const visualSmoke = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

assert.ok(
  main.includes('var main_city_hub_governance := _build_mainline_visual_smoke_player_visible_ui_governance_result({'),
  'world_open_main_city_hub must feed the reusable player_visible_ui_governance_v1 helper.',
)

for (const requiredField of [
  'mainCityHubPlayerUiGovernanceContractId',
  'mainCityHubPlayerUiGovernanceVerified',
  'mainCityHubForbiddenVisibleCopyClear',
  'mainCityHubVisibleDensityOk',
]) {
  assert.ok(main.includes(requiredField), `main city hub smoke result must expose ${requiredField}.`)
  assert.ok(visualSmoke.includes(`"${requiredField}"`), `world_open_main_city_hub runner must require ${requiredField}.`)
}

for (const forbiddenVisibleCopy of ['read model', 'authority', 'tier', 'child page', '结构化展示', '当前切项']) {
  assert.ok(
    main.includes(`"${forbiddenVisibleCopy}"`),
    `main city hub governance adapter must check forbidden visible copy: ${forbiddenVisibleCopy}`,
  )
}

console.log('[godot_main_city_hub_player_ui_governance_adapter_contract] all checks passed')
