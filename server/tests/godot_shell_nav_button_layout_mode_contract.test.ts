import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mainSource = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')

assert.equal(
  mainSource.includes('"compact_recruit_right_hidden_scrollbar_v1" if compact_layout_ok else "legacy_or_unverified"'),
  false,
  'shell nav button layout summary should not fall back to legacy_or_unverified',
)
assert.ok(
  mainSource.includes('"compact_recruit_right_hidden_scrollbar_v1" if compact_layout_ok else "bottom_nav_recruit_layout_incomplete"'),
  'shell nav button layout summary should expose an explicit incomplete state',
)

console.log('[godot_shell_nav_button_layout_mode_contract] all checks passed')
