import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const visualSmoke = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

assert.match(
  main,
  /var battle_report_governance := _build_mainline_visual_smoke_player_visible_ui_governance_result\(/,
  'battle_report_list_density must use the reusable player_visible_ui_governance_v1 helper.',
)

for (const field of [
  'battleReportListPlayerUiGovernanceContractId',
  'battleReportListPlayerUiGovernanceVerified',
  'battleReportListForbiddenVisibleCopyClear',
  'battleReportListVisibleDensityOk',
]) {
  assert.ok(main.includes(field), `battle report smoke result must expose ${field}.`)
}

assert.ok(
  visualSmoke.includes('"battleReportListPlayerUiGovernanceContractId"') &&
    visualSmoke.includes('"battleReportListPlayerUiGovernanceVerified"'),
  'battle_report_list_density runner must require battle report governance fields.',
)

console.log('[godot_battle_report_player_ui_governance_adapter_contract] all checks passed')
