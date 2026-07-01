import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const factorySource = readFileSync('godot-client/scripts/ui/slg_ui_component_factory.gd', 'utf-8')
const listPageSource = readFileSync('godot-client/scripts/ui/battle_report_list_page.gd', 'utf-8')
const presenterSource = readFileSync('godot-client/scripts/ui/presenters/battle_report_presenter.gd', 'utf-8')
const mainSource = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const visualSmokeSource = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')
const closureBatchSource = readFileSync('godot-client/tools/run_mainline_ui_closure_batch.py', 'utf-8')

const token = 'battle_report_list_hero_card_readability_v1'

assert.ok(
  factorySource.includes(`const BATTLE_REPORT_LIST_HERO_CARD_READABILITY_TOKEN := "${token}"`),
  'Battle report list hero cards must expose a stable readability token owned by SlgUiComponentFactory.',
)

for (const [field, expected] of [
  ['battle_report_list_hero_fallback_font_size', '15'],
  ['battle_report_list_hero_star_font_size', '13'],
  ['battle_report_list_hero_name_font_size', '16'],
  ['battle_report_list_hero_level_font_size', '14'],
] as const) {
  assert.match(
    factorySource,
    new RegExp(`static func ${field}\\(\\) -> int:\\s*\\n\\s*return ${expected}`),
    `${field} must return ${expected} for the readable list-card pass.`,
  )
}

assert.match(
  factorySource,
  /static func battle_report_list_hero_info_plate_min_height\(\) -> float:\s*\n\s*return 42\.0/,
  'Hero info plate must reserve stable height for larger name/level copy.',
)

assert.ok(
  factorySource.includes('apply_battle_report_list_hero_info_plate_style'),
  'Hero info plate style must be owned by SlgUiComponentFactory.',
)

for (const summaryField of [
  'battleReportListHeroCardReadabilityToken',
  'battleReportListHeroInfoPlateVisibleCount',
  'battleReportListHeroInfoPlateMinHeight',
]) {
  assert.ok(factorySource.includes(`summary["${summaryField}"]`) || listPageSource.includes(`"${summaryField}"`), `Summary must expose ${summaryField}.`)
  assert.ok(mainSource.includes(`"${summaryField}": page_summary.get("${summaryField}"`), `battle_report_list_density click result must expose ${summaryField} at top level.`)
  assert.ok(visualSmokeSource.includes(`"${summaryField}"`), `battle_report_list_density visual smoke must require ${summaryField}.`)
}

assert.ok(
  presenterSource.includes('not (raw_record_variant as Dictionary).is_empty()'),
  'World report list cards must fall back to raw_report when _source_record is absent or empty, so fixture attackerUnits keep real hero names and portraits.',
)

assert.ok(
  mainSource.includes('var is_battle_report_click_action := click_action.begins_with("battle_report_")'),
  'Battle report fixture click actions must be classified as formal panel actions.',
)

assert.ok(
  mainSource.includes('is_main_city_overlay_click_action or is_battle_report_click_action'),
  'Battle report fixture click actions must be allowed to satisfy runtimeRequirementOk through clickActionResult.ok and screenshot proof.',
)

assert.ok(
  mainSource.includes('panel_requirement_ok = true') && mainSource.includes('overlayPanelLayoutAfter'),
  'Battle report fixture click actions must refresh panelRequirementOk after the action opens the panel.',
)

const compactPortraitSource = listPageSource.slice(
  listPageSource.indexOf('func _build_compact_portrait_stage('),
  listPageSource.indexOf('func _resolve_list_star_label('),
)

assert.ok(
  compactPortraitSource.includes('BattleReportListHeroInfoPlate') &&
    compactPortraitSource.includes('apply_battle_report_list_hero_info_plate_style') &&
    compactPortraitSource.includes('battle_report_list_hero_info_plate_min_height()'),
  'Battle report list hero labels must sit on the shared readability info plate.',
)

for (const closureNeedle of [
  `BATTLE_REPORT_LIST_HERO_CARD_READABILITY_TOKEN = "${token}"`,
  'battleReportListHeroCardReadabilityToken!=battle_report_list_hero_card_readability_v1',
  'battleReportListHeroInfoPlateVisibleCount<1',
  'battleReportListHeroInfoPlateMinHeight<42',
  'battleReportListHeroFallbackFontSize<15',
  'battleReportListHeroStarFontSize<13',
  'battleReportListHeroNameFontSize<16',
  'battleReportListHeroLevelFontSize<14',
]) {
  assert.ok(closureBatchSource.includes(closureNeedle), `Closure batch must guard ${closureNeedle}.`)
}

console.log('[godot_battle_report_list_hero_card_readability_contract] all checks passed')
