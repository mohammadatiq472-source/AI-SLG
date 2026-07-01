import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const presenter = readFileSync('godot-client/scripts/ui/presenters/battle_report_presenter.gd', 'utf-8')
const detailPage = readFileSync('godot-client/scripts/ui/battle_report_detail_page.gd', 'utf-8')

const functionSource = (source: string, signature: string): string => {
  const start = source.indexOf(signature)
  if (start < 0) {
    return ''
  }
  const end = source.indexOf('\nfunc ', start + signature.length)
  return source.slice(start, end > start ? end : source.length)
}

const refreshView = functionSource(detailPage, 'func _refresh_view() -> void:')
const resolveDetailPageContract = functionSource(detailPage, 'func _resolve_detail_page_contract(detail_page_contract: Dictionary) -> Dictionary:')
const rebuildDetailPageBlocks = functionSource(detailPage, 'func _rebuild_detail_page_blocks(page_contract: Dictionary, detail_frame_contract: Dictionary) -> void:')
const detailSummary = functionSource(detailPage, 'func get_mainline_visual_smoke_detail_summary() -> Dictionary:')
const forbiddenHits = functionSource(detailPage, 'func _collect_player_visible_copy_forbidden_hits(root: Node) -> Array:')
const buildDetailPages = functionSource(
  presenter,
  'func _build_detail_pages(',
)
const buildAiFeedback = functionSource(
  presenter,
  'func _build_ai_living_feedback_block(',
)
const formatRuntimeLine = functionSource(presenter, 'func _format_runtime_action_player_line(runtime_context: Dictionary) -> String:')
const sanitizeVisibleCopy = functionSource(
  presenter,
  'func _sanitize_battle_report_player_visible_copy(value: String, fallback: String = BATTLE_REPORT_PLAYER_VISIBLE_COPY_FALLBACK) -> String:',
)
const copyHasForbidden = functionSource(presenter, 'func _battle_report_copy_has_forbidden_term(value: String) -> bool:')

for (const [label, block] of [
  ['detail refresh view', refreshView],
  ['resolve detail page contract', resolveDetailPageContract],
  ['rebuild detail page blocks', rebuildDetailPageBlocks],
  ['detail summary', detailSummary],
  ['forbidden hits', forbiddenHits],
  ['build detail pages', buildDetailPages],
  ['build AI feedback', buildAiFeedback],
  ['format runtime player line', formatRuntimeLine],
  ['sanitize visible copy', sanitizeVisibleCopy],
  ['copy forbidden helper', copyHasForbidden],
] as const) {
  assert.ok(block.length > 0, `Battle report broader copy contract must keep ${label}.`)
}

assert.ok(
  detailPage.includes('const BATTLE_REPORT_DETAIL_EMPTY_FEEDBACK_COPY_CONTRACT := "battle_report_empty_feedback_player_copy_v1"') &&
    detailSummary.includes('"battleReportDetailEmptyFeedbackCopyContract"') &&
    detailSummary.includes('"battleReportDetailEmptyFeedbackCopyOk"'),
  'BattleReportDetailPage must expose a focused empty/feedback copy governance contract.',
)

for (const safeFallback of [
  '"兵力：--"',
  '"我方队伍"',
  '"敌方队伍"',
  '"士气：--"',
  '"暂无可显示详情。"',
  '"战报详情暂未送达。"',
]) {
  assert.ok(
    refreshView.includes(safeFallback) ||
      resolveDetailPageContract.includes(safeFallback) ||
      rebuildDetailPageBlocks.includes(safeFallback),
    `BattleReportDetailPage must use player-facing fallback copy: ${safeFallback}`,
  )
}

for (const removedFallback of [
  '"SOM-D01-A 数值位"',
  '"SOM-D01-C 我方标题位"',
  '"SOM-D01-D 数值位"',
  '"SOM-D01-F 敌方标题位"',
  '"SOM-D06-A 我方士气位"',
  '"SOM-D06-B 敌方士气位"',
  '当前页等待 detail_page_contract child-page 合同。',
  '当前只固定结构关系。',
]) {
  assert.equal(
    detailPage.includes(removedFallback),
    false,
    `BattleReportDetailPage must not keep debug-like fallback visible copy: ${removedFallback}`,
  )
}

for (const forbiddenTerm of [
  '"SOM-"',
  '"SOM_"',
  '"child-page"',
  '"detail_page_contract"',
  '"read model"',
  '"backend"',
  '"authority"',
  '"tier"',
]) {
  assert.ok(forbiddenHits.includes(forbiddenTerm), `Detail visible-copy guard must include ${forbiddenTerm}.`)
}

assert.ok(
  presenter.includes('const BATTLE_REPORT_PLAYER_VISIBLE_COPY_FALLBACK := "战报内容暂未送达。"') &&
    presenter.includes('const BATTLE_REPORT_PLAYER_VISIBLE_FORBIDDEN_TERMS := [') &&
    presenter.includes('"feedback.battleRecords"') &&
    presenter.includes('"battle_report_detail"') &&
    presenter.includes('"source_label"') &&
    presenter.includes('"fixture"') &&
    presenter.includes('"local_only"'),
  'BattleReportPresenter must define visible-copy fallback and forbidden terms for broader feedback copy.',
)

assert.ok(
  buildAiFeedback.includes('_sanitize_battle_report_player_visible_copy(_first_non_empty([') &&
    buildAiFeedback.includes(']), "AI玩家")') &&
    buildAiFeedback.includes(']), "战后复盘")') &&
    buildAiFeedback.includes(']), "根据本次交战结果更新下一步行动判断。")') &&
    buildAiFeedback.includes(']), "结果待确认")'),
  'AI living feedback actor/action/reason/result must be sanitized before visible rendering.',
)

assert.ok(
  presenter.includes('"title": "后续"') &&
    presenter.includes('_format_runtime_action_player_line(runtime_context)') &&
    !presenter.includes('"title": "运行态"') &&
    !presenter.includes('"最近动作：%s (%s)"'),
  'Battle report stats/runtime block must use player-facing follow-up copy instead of raw runtime action text.',
)

assert.ok(
  formatRuntimeLine.includes('return "后续行动待确认。"') &&
    formatRuntimeLine.includes('return "后续行动已记录。"') &&
    sanitizeVisibleCopy.includes('return fallback') &&
    copyHasForbidden.includes('lower_value.find(term) >= 0'),
  'Runtime and feedback copy helpers must fall back to short player-facing Chinese when internal terms appear.',
)

assert.ok(
  detailPage.includes('BATTLE_REPORT_UI_COMPONENT_FACTORY') &&
    detailPage.includes('DETAIL_BUTTON_LIVE_TEXT_CONTRACT') &&
    presenter.includes('_resolve_battle_report_detail_source_label') &&
    presenter.includes('return _resolve_report_source_label(raw_source)'),
  'Existing Stage 226 source-label path and real Button/style owner tokens must remain intact.',
)

console.log('[godot_battle_report_empty_feedback_player_copy_governance_contract] all checks passed')
