import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const visualSmoke = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')
const interiorPanel = readFileSync('godot-client/scripts/ui/interior_panel.gd', 'utf-8')

assert.ok(
  main.includes('interior_home_governance = _build_mainline_visual_smoke_player_visible_ui_governance_result({'),
  'world_open_main_city_interior must feed the reusable player_visible_ui_governance_v1 helper.',
)

for (const requiredField of [
  'interiorHomePlayerUiGovernanceContractId',
  'interiorHomePlayerUiGovernanceVerified',
  'interiorHomeForbiddenVisibleCopyClear',
  'interiorHomeVisibleDensityOk',
]) {
  assert.ok(main.includes(requiredField), `interior home smoke result must expose ${requiredField}.`)
  assert.ok(visualSmoke.includes(`"${requiredField}"`), `world_open_main_city_interior runner must require ${requiredField}.`)
}

for (const forbiddenVisibleCopy of ['read model', 'authority', 'tier', 'child page', '结构化展示', '当前切项']) {
  assert.ok(
    main.includes(`"${forbiddenVisibleCopy}"`),
    `interior governance adapter must check forbidden visible copy: ${forbiddenVisibleCopy}`,
  )
}

for (const panelForbiddenCopy of ['backend', 'read model', 'contract', 'authority', 'tier', '/api/', 'fixture', 'local_only']) {
  assert.ok(
    interiorPanel.includes(`"${panelForbiddenCopy}"`),
    `InteriorPanel must guard backend-authority empty/error copy risk: ${panelForbiddenCopy}`,
  )
}

assert.ok(
  interiorPanel.includes('class_name InteriorPanel') && interiorPanel.includes('UI_COMPONENT_FACTORY'),
  'InteriorPanel must remain an explicit page owner using SlgUiComponentFactory.',
)

assert.ok(
  interiorPanel.includes('apply_interior_home_entry_button_style') &&
    interiorPanel.includes('apply_interior_affairs_work_order_card_style'),
  'InteriorPanel must retain shared chrome/style owner tokens for home entries and work-order cards.',
)

for (const leakedVisibleCopy of ['后端建筑 authority', 'backend building authority', 'contract id', 'fixture/local_only']) {
  assert.ok(
    !interiorPanel.includes(leakedVisibleCopy),
    `InteriorPanel player-visible copy must not leak engineering wording: ${leakedVisibleCopy}`,
  )
}

assert.ok(
  interiorPanel.includes('已加入待办安排，暂不消耗资源。'),
  'InteriorPanel submitted upgrade empty/pending copy must be short player-facing Chinese.',
)

for (const liveActionToken of [
  'work_order_action_requested',
  'interior_work_order_action_button_v1',
  'interior_work_order_action_live_text_v1',
  'InteriorWorkOrderActionButton_',
]) {
  assert.ok(interiorPanel.includes(liveActionToken), `InteriorPanel must retain real Button/action/meta token: ${liveActionToken}`)
}

console.log('[godot_main_city_interior_player_ui_governance_adapter_contract] all checks passed')
