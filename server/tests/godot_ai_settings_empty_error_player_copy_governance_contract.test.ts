import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const aiPanel = readFileSync('godot-client/scripts/ui/ai_panel.gd', 'utf-8')
const aiPanelPresenter = readFileSync('godot-client/scripts/ui/presenters/ai_panel_presenter.gd', 'utf-8')

const functionSource = (source: string, signature: string): string => {
  const start = source.indexOf(signature)
  if (start < 0) {
    return ''
  }
  const end = source.indexOf('\nfunc ', start + signature.length)
  return source.slice(start, end > start ? end : source.length)
}

const openContextPopup = functionSource(aiPanel, 'func _open_context_file_popup() -> void:')
const ensureContextPopup = functionSource(aiPanel, 'func _ensure_context_file_popup() -> void:')
const contextFileSelected = functionSource(aiPanel, 'func _on_context_file_selected(path: String) -> void:')
const saveVoiceProfile = functionSource(aiPanel, 'func _on_voice_profile_save_pressed() -> void:')
const refreshVoiceCatalog = functionSource(aiPanel, 'func _refresh_voice_profile_catalog(show_sync_status: bool = false) -> void:')
const setVoiceStatus = functionSource(aiPanel, 'func _set_voice_profile_status(text: String) -> void:')
const updateAvailability = functionSource(aiPanel, 'func _update_voice_availability_label() -> void:')
const extractErrorText = functionSource(aiPanel, 'func _extract_error_text(response: Dictionary) -> String:')
const sanitizeErrorText = functionSource(aiPanel, 'func _sanitize_ai_panel_player_visible_error_text(text: String) -> String:')
const sanitizeVisibleCopy = functionSource(aiPanel, 'func _sanitize_ai_panel_player_visible_copy(text: String, fallback: String) -> String:')
const voiceHero = functionSource(aiPanelPresenter, 'func _build_ai_voice_profile_status_hero(primary_display_name: String, ai_player_runtimes: Array) -> Dictionary:')
const formatDisplayCopy = functionSource(aiPanelPresenter, 'func _format_ai_display_copy(value: String) -> String:')
const visibleNameForbidden = functionSource(aiPanelPresenter, 'func _ai_player_visible_name_has_forbidden_term(value: String) -> bool:')

for (const [label, block] of [
  ['open context popup', openContextPopup],
  ['ensure context popup', ensureContextPopup],
  ['context file selected', contextFileSelected],
  ['save voice profile', saveVoiceProfile],
  ['refresh voice catalog', refreshVoiceCatalog],
  ['set voice status', setVoiceStatus],
  ['update availability', updateAvailability],
  ['extract error text', extractErrorText],
  ['sanitize error text', sanitizeErrorText],
  ['sanitize visible copy', sanitizeVisibleCopy],
  ['voice profile hero', voiceHero],
  ['AI display copy formatter', formatDisplayCopy],
  ['AI visible-name forbidden filter', visibleNameForbidden],
] as const) {
  assert.ok(block.length > 0, `AIPanel must keep ${label} implementation for player-copy governance.`)
}

assert.ok(
  aiPanel.includes('const AI_PANEL_PLAYER_VISIBLE_COPY_FORBIDDEN_TERMS := [') &&
    aiPanel.includes('"backend"') &&
    aiPanel.includes('"read model"') &&
    aiPanel.includes('"authority"') &&
    aiPanel.includes('"tier"') &&
    aiPanel.includes('"contract"') &&
    aiPanel.includes('"/api/"') &&
    aiPanel.includes('".env"') &&
    aiPanel.includes('"provider"') &&
    aiPanel.includes('"snake_case"') &&
    aiPanel.includes('"fixture"') &&
    aiPanel.includes('"local_only"') &&
    aiPanel.includes('"skll"'),
  'AIPanel must define an explicit forbidden-term set for AI settings empty/error player copy.',
)

assert.ok(
  setVoiceStatus.includes('_sanitize_ai_panel_player_visible_copy(text, "读取失败，请稍后再试")') &&
    updateAvailability.includes('_sanitize_ai_panel_player_visible_copy(visible_text, "语音状态暂不可用")') &&
    extractErrorText.includes('_sanitize_ai_panel_player_visible_error_text(message)') &&
    extractErrorText.includes('_sanitize_ai_panel_player_visible_error_text(message_text)') &&
    sanitizeErrorText.includes('_sanitize_ai_panel_player_visible_copy(text, "读取失败，请稍后再试")'),
  'AIPanel voice settings must sanitize backend/error payloads before they reach visible labels.',
)

assert.ok(
  saveVoiceProfile.includes('"连接暂不可用，请稍后再试"') &&
    !saveVoiceProfile.includes('"后端未连接，无法保存"') &&
    refreshVoiceCatalog.includes('"连接暂不可用，先使用默认声色"') &&
    !refreshVoiceCatalog.includes('"后端未连接，展示默认语音档位"'),
  'AIPanel voice connection empty/error copy must be short player-facing Chinese, not backend wording.',
)

assert.ok(
  openContextPopup.includes('"可导入本地档案，也可以直接填写身份、记忆或指令。"') &&
    ensureContextPopup.includes('_context_file_kind_option.add_item("技能", 2)') &&
    contextFileSelected.includes('"图片档案稍后开放。请先选择头像或导入文字档案。"') &&
    contextFileSelected.includes('"已读取档案。"'),
  'AIPanel context-document empty copy must avoid raw file-format and SKLL wording in visible labels.',
)

for (const leakedVisibleCopy of [
  '玩家声音克隆：后续能力（当前不可用）',
  '可选择本地 txt/md/skll 文件，也可以直接粘贴身份、记忆或 SKLL 文档。',
  '图片档案入口暂未开放。请先使用自选头像，或导入 txt / md / skll 档案文件。',
  '_context_file_kind_option.add_item("SKLL", 2)',
  '文件已读取：%s',
]) {
  assert.equal(
    aiPanel.includes(leakedVisibleCopy),
    false,
    `AIPanel player-visible copy must not keep raw engineering/file-format wording: ${leakedVisibleCopy}`,
  )
}

assert.ok(
  aiPanel.includes('class_name AIPanel') &&
    aiPanel.includes('UI_COMPONENT_FACTORY') &&
    aiPanel.includes('apply_ai_panel_action_button_style') &&
    aiPanel.includes('snapshot_action_live_text_contract'),
  'AIPanel must retain explicit owner/style tokens and real Button/action metadata.',
)

assert.ok(
  aiPanelPresenter.includes('const AI_PANEL_PLAYER_VISIBLE_NAME_FORBIDDEN_TERMS := [') &&
    aiPanelPresenter.includes('"contract"') &&
    aiPanelPresenter.includes('"backend"') &&
    aiPanelPresenter.includes('"read model"') &&
    aiPanelPresenter.includes('"authority"') &&
    aiPanelPresenter.includes('"tier"') &&
    aiPanelPresenter.includes('"/api/"') &&
    aiPanelPresenter.includes('"fixture"') &&
    aiPanelPresenter.includes('"local_only"') &&
    formatDisplayCopy.includes('_ai_player_visible_name_has_forbidden_term(text)') &&
    formatDisplayCopy.includes('return "AI玩家"'),
  'AIPanelPresenter must sanitize fixture/test/backend-like AI display names before they reach visible hero copy.',
)

assert.ok(
  voiceHero.includes('"subtitle": "声色只影响这个 AI 玩家说话时的听感；不改变行动、托管或管理权限。"') &&
    voiceHero.includes('"meta": "只显示公开名称"') &&
    !voiceHero.includes('后端权限') &&
    !voiceHero.includes('供应商名'),
  'AIPanelPresenter voice hero must not show backend permission or provider wording to players.',
)

console.log('[godot_ai_settings_empty_error_player_copy_governance_contract] all checks passed')
