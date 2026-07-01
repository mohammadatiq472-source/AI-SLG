import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync('package.json', 'utf-8')) as {
  scripts?: Record<string, string>
}

const scripts = packageJson.scripts ?? {}
const governanceGuardScript = scripts['test:ai:governance-guard'] ?? ''

const requiredEntries = [
  ...Object.keys(scripts)
    .filter((name) => name.startsWith('test:ai:') && name !== 'test:ai:governance-guard')
    .sort(),
  'test:world:as-ai-player-contract',
]

assert.ok(governanceGuardScript, 'test:ai:governance-guard script must exist')

for (const entry of requiredEntries) {
  assert.ok(
    scripts[entry],
    `${entry} script must exist before it can be covered by test:ai:governance-guard`,
  )
  assert.ok(
    governanceGuardScript.includes(`npm run ${entry}`),
    `test:ai:governance-guard must include npm run ${entry}`,
  )
}

console.log('[ai_player_governance_guard_script_contract] all checks passed')
