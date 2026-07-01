import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const runner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')
const presenter = readFileSync('godot-client/scripts/ui/presenters/mail_presenter.gd', 'utf-8')
const panel = readFileSync('godot-client/scripts/ui/mail_panel.gd', 'utf-8')
const sectionPage = readFileSync('godot-client/scripts/ui/slg_snapshot_section_page.gd', 'utf-8')

const ACTION = 'world_open_main_city_mail_live_inbox_proof'

assert.ok(runner.includes(`"${ACTION}"`), 'runner must expose the live inbox/mail screenshot proof action.')
assert.ok(main.includes(`"${ACTION}"`), 'main.gd must route the live inbox/mail screenshot proof action.')
assert.ok(main.includes('_press_mainline_visual_smoke_mail_live_inbox_proof'), 'main.gd must implement a focused live inbox proof helper.')
assert.ok(main.includes('get_unified_inbox'), 'Godot proof must read the live /api/inbox route through BackendApiClient.')
assert.ok(presenter.includes('build_live_inbox_overlay_payload'), 'MailPresenter must build a live inbox payload for the existing mail panel.')

for (const requiredField of [
  'newScreenshotGenerated',
  'staticGovernanceGreen',
  'visualAcceptanceClaimedSurfaces',
  'visualAcceptanceNotClaimedSurfaces',
  'liveInboxSource',
  'liveInboxRoute',
  'liveInboxReadbackOk',
  'mailPanelLiveInboxWired',
  'mailPanelLiveInboxItemCount',
  'mailPanelLiveInboxVisibleItemCount',
  'mailPanelLiveInboxRowButtonVisible',
  'mailPanelLiveInboxRowButtonNodeName',
  'mailPanelLiveInboxRowButtonActionId',
  'mailPanelLiveInboxRowButtonClicked',
  'visibleCopyForbiddenHits',
  'playerVisibleEngineeringCopyLeak',
  'styleOwner',
]) {
  assert.ok(main.includes(`"${requiredField}"`), `main.gd live inbox proof summary must expose ${requiredField}.`)
  assert.ok(runner.includes(`"${requiredField}"`), `runner must require ${requiredField} for the live inbox proof action.`)
}

for (const requiredPresenterField of [
  'mailPanelSource',
  'live_unified_inbox_route',
  'mailPanelVisualMode',
  'live_inbox_mail_snapshot_v1',
  'mailPanelBackendBoundary',
  'live_route_readback_player_visible_copy_translated',
  'mailPanelNoClaimAuthority',
  'MailInboxItemButton_',
]) {
  assert.ok(
    presenter.includes(requiredPresenterField) || panel.includes(requiredPresenterField) || sectionPage.includes(requiredPresenterField),
    `mail presenter/panel must expose live proof token: ${requiredPresenterField}`,
  )
}

for (const forbiddenVisibleLiteral of [
  'read model 示例未加载',
  '邮件 UI 依赖 read model',
  '后端按玩家返回',
]) {
  assert.ok(
    !presenter.includes(forbiddenVisibleLiteral),
    `MailPresenter must not keep engineering fallback copy visible to players: ${forbiddenVisibleLiteral}`,
  )
}

assert.ok(panel.includes('mailPanelRowSelectButtonVisibleCount'), 'mail panel must still expose real row Button counts.')
assert.ok(panel.includes('mailPanelRowSelectActionIds'), 'mail panel must still expose real row Button action ids.')

console.log('[godot_inbox_mail_live_screenshot_proof_contract] all checks passed')
