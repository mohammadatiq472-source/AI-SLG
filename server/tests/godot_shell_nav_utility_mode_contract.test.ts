import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mainSource = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')

assert.equal(
  mainSource.includes('"shellNavUtilityRowMode": "top_parallel_command_buttons_v1" if utility_row_top_parallel_ok and utility_command_skin_ok else "legacy_or_unverified"'),
  false,
  'shell nav utility row summary should not fall back to legacy_or_unverified',
)
assert.ok(
  mainSource.includes('"shellNavUtilityRowMode": "top_parallel_command_buttons_v1" if utility_row_top_parallel_ok and utility_command_skin_ok else "top_parallel_command_buttons_incomplete"'),
  'shell nav utility row summary should expose an explicit incomplete state',
)

console.log('[godot_shell_nav_utility_mode_contract] all checks passed')
