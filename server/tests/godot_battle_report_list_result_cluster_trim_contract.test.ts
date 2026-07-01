import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const presenter = readFileSync('godot-client/scripts/ui/presenters/battle_report_presenter.gd', 'utf-8')
const listPage = readFileSync('godot-client/scripts/ui/battle_report_list_page.gd', 'utf-8')

assert.doesNotMatch(
  presenter,
  /ai_action_actor_label|ai_action_reason_label|ai_action_target_label|ai_action_next_step_label/,
  'Battle report list presenter must not feed Who/Why/Target/Next-step rows into the victory result cluster.',
)

assert.doesNotMatch(
  listPage,
  /_build_ai_action_result_card|_build_ai_action_result_row|ai_action_result_contract/,
  'Battle report list page must not render the Who/Why/Target/Next-step card under the victory result.',
)

assert.match(
  listPage,
  /battleReportListAiActionResultCardVisible[\s\S]*false/,
  'Battle report list summary must expose that the old AI action result card is hidden.',
)

console.log('[godot_battle_report_list_result_cluster_trim_contract] all checks passed')
