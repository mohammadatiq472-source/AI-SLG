import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const SOURCE_PATH = 'server/src/application/world/persistence/worldPersistence.ts'

function run() {
  const source = readFileSync(SOURCE_PATH, 'utf-8')

  assert.match(
    source,
    /rename\(/,
    'world snapshot persistence must atomically replace the final JSON file via rename()',
  )
  assert.match(
    source,
    /WORLD_STATE_PERSIST_PATH.*\.tmp|\.tmp.*WORLD_STATE_PERSIST_PATH/,
    'world snapshot persistence must write to a temp file derived from WORLD_STATE_PERSIST_PATH before replacement',
  )
  assert.doesNotMatch(
    source,
    /writeFile\(WORLD_STATE_PERSIST_PATH,\s*payload,\s*'utf8'\)/,
    'world snapshot persistence must not write the final JSON file directly',
  )

  console.log('[world_persistence_atomic_snapshot_write_contract] all checks passed')
}

run()
