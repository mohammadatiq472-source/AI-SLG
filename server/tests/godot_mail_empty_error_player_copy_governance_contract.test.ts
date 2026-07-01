import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mailPresenter = readFileSync('godot-client/scripts/ui/presenters/mail_presenter.gd', 'utf-8')
const mailPanel = readFileSync('godot-client/scripts/ui/mail_panel.gd', 'utf-8')

const functionSource = (source: string, signature: string): string => {
  const start = source.indexOf(signature)
  if (start < 0) {
    return ''
  }
  const end = source.indexOf('\nfunc ', start + signature.length)
  return source.slice(start, end > start ? end : source.length)
}

const buildSnapshot = functionSource(mailPresenter, 'func build_snapshot(_runtime_context: Dictionary = {}) -> Dictionary:')
const buildLiveSnapshot = functionSource(mailPresenter, 'func build_live_inbox_snapshot(live_inbox: Dictionary, _runtime_context: Dictionary = {}) -> Dictionary:')
const materializeLiveItem = functionSource(mailPresenter, 'func _materialize_live_inbox_item(raw_item: Dictionary, organization: Dictionary, index: int) -> Dictionary:')
const cleanLiveCopy = functionSource(mailPresenter, 'func _clean_live_mail_copy(raw_text: String, fallback: String = MAIL_PLAYER_VISIBLE_COPY_FALLBACK) -> String:')
const panelSummary = functionSource(mailPanel, 'func get_mainline_visual_smoke_summary(page_id: String = "") -> Dictionary:')
const visibleHits = functionSource(mailPanel, 'func _mail_player_visible_forbidden_copy_hits() -> Array:')
const collectVisibleParts = functionSource(mailPanel, 'func _mail_collect_player_visible_copy_parts() -> Array:')
const collectBlock = functionSource(mailPanel, 'func _mail_collect_visible_copy_from_block(parts: Array, block: Dictionary) -> void:')
const collectMailItem = functionSource(mailPanel, 'func _mail_collect_visible_copy_from_mail_item(parts: Array, item: Dictionary) -> void:')

for (const [label, block] of [
  ['build snapshot', buildSnapshot],
  ['build live snapshot', buildLiveSnapshot],
  ['materialize live item', materializeLiveItem],
  ['clean live mail copy', cleanLiveCopy],
  ['mail panel summary', panelSummary],
  ['visible forbidden hits', visibleHits],
  ['collect visible parts', collectVisibleParts],
  ['collect block visible copy', collectBlock],
  ['collect mail item visible copy', collectMailItem],
] as const) {
  assert.ok(block.length > 0, `Mail player-copy governance must keep ${label}.`)
}

assert.ok(
  mailPresenter.includes('const MAIL_PLAYER_VISIBLE_COPY_FALLBACK := "邮件暂未同步，请稍后再看。"') &&
    mailPresenter.includes('const MAIL_PLAYER_VISIBLE_FORBIDDEN_TERMS := [') &&
    mailPresenter.includes('"/api/inbox"') &&
    mailPresenter.includes('"inbox_mail"') &&
    mailPresenter.includes('"read model"') &&
    mailPresenter.includes('"backend"') &&
    mailPresenter.includes('"authority"') &&
    mailPresenter.includes('"tier"') &&
    mailPresenter.includes('"snake_case"') &&
    mailPresenter.includes('"fixture"') &&
    mailPresenter.includes('"local_only"'),
  'MailPresenter must define a visible-copy forbidden-term set for live inbox empty/error copy.',
)

assert.ok(
  buildSnapshot.includes('"empty_state_text": "暂无可查看邮件。"') &&
    buildLiveSnapshot.includes('"empty_state_text": "暂无可领取邮件。"'),
  'Mail empty states must be short player-facing Chinese.',
)

assert.ok(
  materializeLiveItem.includes('_clean_live_mail_copy(str(raw_item.get("title", _format_live_inbox_kind_label(kind))).strip_edges(), _format_live_inbox_kind_label(kind))') &&
    materializeLiveItem.includes('_clean_live_mail_copy(str(raw_item.get("summary", "")).strip_edges(), "")') &&
    cleanLiveCopy.includes('lower_text.find(token) >= 0') &&
    cleanLiveCopy.includes('return fallback'),
  'Live inbox title/summary must be sanitized before they reach player-visible mail rows.',
)

assert.ok(
  mailPanel.includes('const MAIL_PLAYER_VISIBLE_COPY_CONTRACT := "mail_empty_error_player_copy_v1"') &&
    mailPanel.includes('const MAIL_PLAYER_VISIBLE_FORBIDDEN_TERMS := [') &&
    panelSummary.includes('"mailPanelPlayerVisibleCopyContract"') &&
    panelSummary.includes('"mailPanelPlayerVisibleCopyForbiddenHits"') &&
    panelSummary.includes('"mailPanelPlayerVisibleCopyOk"') &&
    panelSummary.includes('"mailPanelEmptyErrorCopyOwner"'),
  'MailPanel summary must expose a visible-only copy governance result.',
)

for (const requiredCollectorToken of [
  '"empty_state_text"',
  '_snapshot.get("tabs", [])',
  'section.get("summary_lines", [])',
  'block.get("detail_lines", [])',
  'block.get("items", [])',
  'item.get("body_lines", [])',
  'item.get("reward_lines", [])',
]) {
  assert.ok(
    collectVisibleParts.includes(requiredCollectorToken) ||
      collectBlock.includes(requiredCollectorToken) ||
      collectMailItem.includes(requiredCollectorToken),
    `Mail visible-copy collector must include ${requiredCollectorToken}.`,
  )
}

for (const leakedVisibleCopy of [
  '当前没有可显示邮件。',
  '当前没有可领取邮件。',
  'read model 示例未加载',
  '邮件 UI 依赖 read model',
  '后端按玩家返回',
]) {
  assert.equal(
    mailPresenter.includes(leakedVisibleCopy),
    false,
    `MailPresenter must not keep engineering or debug-like visible copy: ${leakedVisibleCopy}`,
  )
}

assert.ok(
  mailPresenter.includes('build_live_inbox_overlay_payload') &&
    mailPresenter.includes('live_unified_inbox_route') &&
    mailPresenter.includes('live_inbox_mail_snapshot_v1') &&
    mailPanel.includes('mailPanelRowSelectButtonVisibleCount') &&
    mailPanel.includes('mailPanelRowSelectActionIds') &&
    mailPanel.includes('mail_panel_row_select_live_text_contract'),
  'Mail implementation must retain the existing live inbox route tokens and real row Button/action metadata.',
)

console.log('[godot_mail_empty_error_player_copy_governance_contract] all checks passed')
