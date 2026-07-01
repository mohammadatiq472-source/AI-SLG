import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const handoff = readFileSync('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md', 'utf8')

for (const required of [
  'Feature Boundary Card',
  'Client artifact changes',
  'Server authoritative changes',
  'Shared contract changes',
  'AI-read changes',
  'Ops/release changes',
  'Secret/persistence/recovery touched',
  'Client package forbidden-data scan',
  'Formal gates',
]) {
  assert.ok(handoff.includes(required), `CURRENT handoff must carry feature boundary card field: ${required}`)
}

console.log('[feature_boundary_card_doc_contract] all checks passed')
