import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function functionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const nextFunc = source.indexOf('\nfunc ', start + signature.length)
  const nextStaticFunc = source.indexOf('\nstatic func ', start + signature.length)
  const candidates = [nextFunc, nextStaticFunc].filter((index) => index > start)
  const end = candidates.length > 0 ? Math.min(...candidates) : source.length
  return source.slice(start, end)
}

const packageJson = read('package.json')
const visualSmoke = read('godot-client/tools/run_mainline_visual_smoke.py')
const main = read('godot-client/scripts/app/main.gd')
const hubOverlay = read('godot-client/scripts/ui/main_city_hub_overlay.gd')
const motionAuthority = read('docs/PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md')
const frontendAuthority = read('docs/PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md')
const productIndex = read('docs/PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md')
const currentHandoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')

const worldOpenConfig = visualSmoke.slice(
  visualSmoke.indexOf('"world_open_main_city_hub": {'),
  visualSmoke.indexOf('"world_open_main_city_hub_jump_coordinate": {'),
)
const runSmokeSource = functionSource(main, 'func _run_mainline_visual_smoke() -> void:')
const hubSummarySource = functionSource(hubOverlay, 'func get_context_summary() -> Dictionary:')

assert.ok(
  packageJson.includes('"test:godot:main-city-slg-experience-contract"'),
  'package.json must expose the Stage 585 main-city SLG experience contract entry',
)

for (const requiredField of [
  '"mainCitySpatialEntryMotionContractId"',
  '"mainCitySpatialEntryMotionProofLevel"',
  '"mainCitySpatialEntryMotionStates"',
  '"mainCitySpatialEntryNoDirectPopup"',
  '"mainCitySpatialEntryRealButtonActionIds"',
  '"mainCitySpatialEntryPlayerLabels"',
  '"mainCitySceneGatehouseLayerVisible"',
  '"mainCitySceneMansionHighlightVisible"',
  '"mainCitySceneSpatialEntryDockVisible"',
]) {
  assert.ok(worldOpenConfig.includes(requiredField), `world_open_main_city_hub must require ${requiredField}`)
  assert.ok(hubSummarySource.includes(requiredField), `MainCityHubOverlay summary must expose ${requiredField}`)
}

assert.ok(
  runSmokeSource.includes('click_action == "world_open_main_city_hub"') &&
    runSmokeSource.includes('"mainCitySlgExperienceShellNavHardGate"') &&
    runSmokeSource.includes('main_city_slg_experience_fixture_owns_fullscreen_spatial_entry_proof') &&
    runSmokeSource.includes('shell_nav_layout_ok = true'),
  'world_open_main_city_hub visual smoke must not fail on unrelated shell-nav hard gate while proving the full-screen main-city surface',
)

assert.ok(
  visualSmoke.includes('--sequence-capture-count') &&
    visualSmoke.includes('movementSequenceStats') &&
    visualSmoke.includes('screenshotVisibilityGate'),
  'visual smoke runner must support movement-frame evidence and screenshot visibility gate',
)

for (const docFact of [
  'Stage 585 - main-city SLG camera / movement-frame / screenshot acceptance',
  'npm.cmd run test:godot:main-city-slg-experience-contract',
  'world_open_main_city_hub',
]) {
  assert.ok(currentHandoff.includes(docFact), `CURRENT handoff must record ${docFact}`)
}

assert.ok(
  productIndex.includes('Stage 585 update: main-city SLG camera / movement-frame / screenshot acceptance'),
  'product authority index must route future agents to Stage 585',
)

assert.ok(
  motionAuthority.includes('## 2026-06-13 Main-City SLG Experience Screenshot Acceptance') &&
    motionAuthority.includes('main_city_slg_experience_screenshot_acceptance_v1'),
  'motion authority must record the Stage 585 screenshot/movement-frame acceptance packet',
)

assert.ok(
  frontendAuthority.includes('## 2026-06-13 Main-city SLG screenshot acceptance update') &&
    frontendAuthority.includes('MainCityHubOverlay'),
  'frontend authority must record the Stage 585 owner and screenshot acceptance update',
)

console.log('[godot_main_city_slg_experience_contract] all checks passed')
