import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')

const presenterSource = readSource('godot-client/scripts/ui/presenters/battle_report_presenter.gd')
const listPageSource = readSource('godot-client/scripts/ui/battle_report_list_page.gd')
const detailPageSource = readSource('godot-client/scripts/ui/battle_report_detail_page.gd')

assert.ok(
  presenterSource.includes('func _resolve_maritime_report_result_chip_id(') &&
    presenterSource.includes('maritime_report_result_chip_id') &&
    presenterSource.includes('maritimeReportResultChipId') &&
    presenterSource.includes('maritime_report_result_chip_v1'),
  'Battle report presenter should resolve maritime result chip ids for both list and detail payloads.',
)

assert.ok(
  !presenterSource.includes('static func _resolve_maritime_report_result_chip_id('),
  'Maritime chip resolver must remain an instance helper because it reuses instance presenter helpers.',
)

assert.ok(
  presenterSource.includes('_build_report_header_block(') &&
    presenterSource.includes('maritime_report_result_chip_id'),
  'Battle report presenter should pass maritime result chip id into the existing list header block.',
)

assert.ok(
  listPageSource.includes('BattleReportMaritimeResultListChip') &&
    listPageSource.includes('battle_report_maritime_result_chip_id') &&
    listPageSource.includes('battleReportListMaritimeResultChipVisibleCount') &&
    listPageSource.includes('maritime_report_result_chip_v1'),
  'Battle report list page should render a maritime marker on existing list items, not a separate page.',
)

assert.ok(
  detailPageSource.includes('BattleReportMaritimeResultChip') &&
    detailPageSource.includes('battle_report_maritime_result_chip_id') &&
    detailPageSource.includes('battleReportDetailMaritimeResultChipId'),
  'Battle report detail page should keep reusing the existing maritime result chip.',
)

assert.ok(
  !presenterSource.includes('naval_battle_report_panel') &&
    !listPageSource.includes('naval_battle_report_panel') &&
    !detailPageSource.includes('naval_battle_report_panel'),
  'W11 must not introduce a separate naval battle report page.',
)

console.log('[godot_battle_report_maritime_reuse_contract] all checks passed')
