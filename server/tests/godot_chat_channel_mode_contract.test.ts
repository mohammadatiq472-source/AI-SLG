import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const chatOverlaySource = readFileSync('godot-client/scripts/ui/main_chat_overlay.gd', 'utf-8')

assert.equal(
  chatOverlaySource.includes('else "legacy_or_unverified"'),
  false,
  'chat channel visual summary should not emit legacy_or_unverified fallback states',
)
assert.ok(
  chatOverlaySource.includes('else "chat_channel_drawer_incomplete"'),
  'chat channel rail summary should expose an explicit incomplete state',
)
assert.ok(
  chatOverlaySource.includes('else "chat_channel_tiles_incomplete"'),
  'chat channel tile summary should expose an explicit incomplete state',
)

console.log('[godot_chat_channel_mode_contract] all checks passed')
