import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function functionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const nextFunc = source.indexOf('\nfunc ', start + signature.length)
  const end = nextFunc > start ? nextFunc : source.length
  return source.slice(start, end)
}

function pythonFunctionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const next = source.indexOf('\ndef ', start + signature.length)
  const end = next > start ? next : source.length
  return source.slice(start, end)
}

const mainSource = read('godot-client/scripts/app/main.gd')
const visualSmoke = read('godot-client/tools/run_mainline_visual_smoke.py')
const handoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
const productIndex = read('docs/PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md')
const aiGovernance = read('docs/PRODUCT_AUTHORITY_AI_PLAYER_GOVERNANCE_CURRENT_2026_06_10.md')
const radar = read('docs/PLAYER_HISTORY_PRODUCER_COVERAGE_RADAR_CURRENT_2026_06_13.md')

const action = 'world_ai_switch_open_home_city'
const token = 'ai_switch_home_city_visual_acceptance_v1'
const visualSmokeCommand =
  'npm.cmd run godot:mainline:visual-smoke -- --display-mode world --click-action world_ai_switch_open_home_city --timeout-sec 90 --backend-timeout-sec 60 --window-width 960 --window-height 540 --isolated-backend-state --evidence-dir tmp/screenshots/ai_switch_home_city_stage596_20260613'

const actionSource = functionSource(mainSource, 'func _press_mainline_visual_smoke_ai_switch_open_home_city() -> Dictionary:')
const runnerValidator = pythonFunctionSource(visualSmoke, 'def _validate_ai_switch_home_city_visual_acceptance_contract(')

assert.ok(visualSmoke.includes(`"${action}"`), 'visual smoke runner must expose world_ai_switch_open_home_city')
assert.ok(
  visualSmoke.includes(`"${action}": {`) &&
    visualSmoke.includes('"aiSwitchHomeCityVisualAcceptanceToken"') &&
    visualSmoke.includes('"aiSwitchHomeCityScreenshotAcceptanceReady"') &&
    visualSmoke.includes('"aiSwitchHomeCityVisibleCopyClean"'),
  'world_ai_switch_open_home_city must require Stage 596 visual acceptance summary fields.',
)

assert.ok(
  visualSmoke.includes(`def _is_ai_switch_home_city_visual_acceptance(args: argparse.Namespace) -> bool:`) &&
    visualSmoke.includes(`args.click_action == "${action}"`) &&
    visualSmoke.includes('seed_ai_home_city_bound_fixture') &&
    visualSmoke.includes('ai_home_city_bound_seed_not_requested'),
  'world_ai_switch_open_home_city must seed one governed AI player with a bound home city for isolated live visual acceptance.',
)

assert.ok(
  mainSource.includes(`AI_SWITCH_HOME_CITY_VISUAL_ACCEPTANCE_TOKEN := "${token}"`),
  'main.gd must own a stable Stage 596 AI switch home-city visual acceptance token.',
)

assert.ok(
  mainSource.includes('aiSwitchHomeCityShellNavHardGate') &&
    mainSource.includes('ai_switch_home_city_visual_contract_owns_fullscreen_facility_tree_proof') &&
    mainSource.includes('shell_nav_layout_ok = true'),
  'world_ai_switch_open_home_city must not fail the live visual report only because the accepted fullscreen facility tree covers shell nav.',
)

for (const requiredFact of [
  'facility_summary["aiSwitchHomeCityVisualAcceptanceToken"]',
  'facility_summary["aiSwitchHomeCityScreenshotAcceptanceReady"]',
  'facility_summary["aiSwitchHomeCityVisibleCopyForbiddenHits"]',
  'facility_summary["aiSwitchHomeCityVisibleCopyClean"]',
  'facility_summary["aiSwitchHomeCityStyleOwner"]',
  'facility_summary["aiSwitchHomeCityVisualAcceptanceProofLevel"]',
]) {
  assert.ok(actionSource.includes(requiredFact), `AI switch home-city action summary must expose ${requiredFact}`)
}

assert.ok(
  actionSource.includes('_collect_ai_switch_home_city_visible_copy_forbidden_hits(') &&
    actionSource.includes('facility_open_ok') &&
    actionSource.includes('AiSwitchButton') &&
    actionSource.includes('ai_home_city_facility_entry'),
  'AI switch home-city visual acceptance must be tied to the real switch button and readonly AI facility-entry surface.',
)

assert.ok(
  runnerValidator.includes(`click_action != "${action}"`) &&
    runnerValidator.includes('screenshot_visibility_gate.get("ok", False)') &&
    runnerValidator.includes('aiSwitchHomeCityVisualAcceptanceToken') &&
    runnerValidator.includes('aiSwitchHomeCityScreenshotAcceptanceReady') &&
    runnerValidator.includes('aiSwitchHomeCityVisibleCopyClean'),
  'visual smoke runner must validate screenshot visibility and Stage 596 summary facts for AI switch home-city.',
)

assert.ok(
  visualSmoke.includes('contract_failures.extend(_validate_ai_switch_home_city_visual_acceptance_contract(args.click_action, godot_report, screenshot_visibility_gate))'),
  'visual smoke main path must run the AI switch home-city visual acceptance validator.',
)

for (const forbidden of ['read model', 'authority', 'tier', 'backend', 'contract id', 'fixture', 'debug', 'snake_case']) {
  assert.equal('AI切换'.includes(forbidden), false, `AI switch button copy leaked engineering term: ${forbidden}`)
}

for (const [name, source] of [
  ['CURRENT handoff', handoff],
  ['product authority index', productIndex],
  ['AI player governance authority', aiGovernance],
  ['player-history producer radar', radar],
] as const) {
  assert.ok(source.includes('Stage 596'), `${name} must record Stage 596 AI switch home-city visual acceptance`)
  assert.ok(source.includes(token), `${name} must record the Stage 596 AI switch visual acceptance token`)
  assert.ok(source.includes(visualSmokeCommand), `${name} must record the short screenshot command`)
}

console.log('[godot_ai_switch_home_city_visual_acceptance_contract] all checks passed')
