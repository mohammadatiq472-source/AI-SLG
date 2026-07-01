import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')

const aiPanelPresenterSource = readSource('godot-client/scripts/ui/presenters/ai_panel_presenter.gd')
const aiPanelSource = readSource('godot-client/scripts/ui/ai_panel.gd')

const resolverStart = aiPanelPresenterSource.indexOf('func _resolve_maritime_activity_chip_id(')
assert.ok(resolverStart >= 0, 'AI panel presenter must keep the existing maritime chip resolver.')
const nextFunctionStart = aiPanelPresenterSource.indexOf('\nfunc ', resolverStart + 1)
const resolverSource = aiPanelPresenterSource.slice(
  resolverStart,
  nextFunctionStart > resolverStart ? nextFunctionStart : aiPanelPresenterSource.length,
)

assert.ok(
  resolverSource.includes('maritimeActivityChipId') &&
    resolverSource.includes('maritime_activity_chip_id') &&
    resolverSource.includes('maritime_activity_chip_v1'),
  'AI panel maritime resolver must continue to support the W8 scout activity chip.',
)

assert.ok(
  resolverSource.includes('maritimeReportResultChipId') &&
    resolverSource.includes('maritime_report_result_chip_id') &&
    resolverSource.includes('maritime_report_result_chip_v1'),
  'AI panel maritime resolver must reuse the W11/W14 intercept result chip instead of requiring a new UI wheel.',
)

assert.ok(
  aiPanelSource.includes('aiPanelMaritimeActivityChipId') &&
    aiPanelSource.includes('aiPanelMaritimeActivityChipVisible') &&
    aiPanelSource.includes('maritime_activity_chip_v1'),
  'AI panel summary must keep the existing maritime activity chip fields for scout and intercept receipts.',
)

console.log('[godot_maritime_patrol_intercept_ai_panel_reuse_contract] all checks passed')
