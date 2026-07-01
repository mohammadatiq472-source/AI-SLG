import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mainSource = readFileSync('godot-client/scripts/app/main.gd', 'utf8')
const smokeRunnerSource = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf8')
const screenshotValidatorSource = readFileSync('godot-client/tools/validate_map_unit_visual_screenshot.py', 'utf8')

const clickAction = 'world_main_map_claim_release_cell'

assert.ok(
  mainSource.includes(`"${clickAction}":`),
  'mainline visual smoke must keep the owner-delta click action implementation.',
)

const hubExemptionIndex = mainSource.indexOf('hub_requirement_ok = true')
assert.ok(hubExemptionIndex >= 0, 'mainline visual smoke must keep an explicit hub requirement exemption block.')
const hubExemptionBlock = mainSource.slice(Math.max(0, hubExemptionIndex - 900), hubExemptionIndex + 120)

assert.ok(
  hubExemptionBlock.includes(`click_action == "${clickAction}"`),
  'owner-delta click action must be exempt from main-city hub visibility so clickActionResult.ok can own the top-level gate.',
)

assert.ok(
  smokeRunnerSource.includes(clickAction),
  'formal mainline visual smoke runner must expose the owner-delta click action.',
)

assert.ok(
  screenshotValidatorSource.includes('mainline_owner_delta_screenshot_acceptance') &&
    screenshotValidatorSource.includes(clickAction) &&
    screenshotValidatorSource.includes("clickActionResult"),
  'map-unit screenshot validator must keep validating owner-delta through clickActionResult.',
)

console.log('[godot_mainline_owner_delta_click_action_top_level_contract] all checks passed')
