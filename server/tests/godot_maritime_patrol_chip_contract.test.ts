import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')

const mainSource = readSource('godot-client/scripts/app/main.gd')
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py')
const aiPanelSource = readSource('godot-client/scripts/ui/ai_panel.gd')
const aiPanelPresenterSource = readSource('godot-client/scripts/ui/presenters/ai_panel_presenter.gd')
const battleReportDetailSource = readSource('godot-client/scripts/ui/battle_report_detail_page.gd')

assert.ok(
  aiPanelPresenterSource.includes('maritime_activity_chip_v1') &&
    aiPanelPresenterSource.includes('ai_receipt_maritime_activity_chip_id') &&
    aiPanelPresenterSource.includes('func _resolve_maritime_activity_chip_id('),
  'AI panel presenter must extract maritime_activity_chip_v1 from seaPatrolScout receipts.',
)

assert.ok(
  aiPanelSource.includes('aiPanelMaritimeActivityChipId') &&
    aiPanelSource.includes('aiPanelMaritimeActivityChipVisible') &&
    aiPanelSource.includes('maritime_activity_chip_v1'),
  'AI panel visual-smoke summary must expose the maritime activity chip.',
)

assert.ok(
  battleReportDetailSource.includes('maritime_report_result_chip_v1') &&
    battleReportDetailSource.includes('battle_report_maritime_result_chip_id') &&
    battleReportDetailSource.includes('battleReportDetailMaritimeResultChipId') &&
    battleReportDetailSource.includes('BattleReportMaritimeResultChip'),
  'Battle-report detail must expose the maritime result chip id and summary fields.',
)

assert.ok(
  mainSource.includes('"world_sea_patrol_report_fixture"') &&
    mainSource.includes('func _press_mainline_visual_smoke_world_sea_patrol_report_fixture() -> Dictionary:') &&
    mainSource.includes('"seaPatrolScout"') &&
    mainSource.includes('"maritimeActivityChipId"') &&
    mainSource.includes('"maritimeReportResultChipId"') &&
    mainSource.includes('"worldSeaPatrolReportFixtureOk"'),
  'main.gd must implement the formal world_sea_patrol_report_fixture action.',
)

assert.ok(
  visualSmokeSource.includes('"world_sea_patrol_report_fixture"') &&
    visualSmokeSource.includes('"worldSeaPatrolReportFixtureOk"') &&
    visualSmokeSource.includes('"worldSeaPatrolMaritimeActivityChipId"') &&
    visualSmokeSource.includes('"worldSeaPatrolMaritimeReportResultChipId"') &&
    visualSmokeSource.includes('"aiPanelMaritimeActivityChipId"') &&
    visualSmokeSource.includes('"battleReportDetailMaritimeResultChipId"'),
  'run_mainline_visual_smoke.py must require the W9 maritime patrol visual-smoke fields.',
)

console.log('[godot_maritime_patrol_chip_contract] all checks passed')
