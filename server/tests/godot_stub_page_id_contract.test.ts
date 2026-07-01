import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mainSource = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')

assert.equal(
  mainSource.includes('"page_id": "legacy_stub_%s" % title'),
  false,
  'stub child page content should not emit legacy_stub_* page ids',
)
assert.ok(
  mainSource.includes('"page_id": "stub_page_%s" % title'),
  'stub child page content should use the replacement stable stub_page_* page id',
)

console.log('[godot_stub_page_id_contract] all checks passed')
