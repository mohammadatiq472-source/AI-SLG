import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const packageJson = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8')) as {
  scripts?: Record<string, string>
}

const soakScriptPath = join(process.cwd(), 'server', 'src', 'evals', 'runAiPlayerLiveAutonomousCombatRecoverySoakGate.ts')
const recoveryScriptPath = join(process.cwd(), 'server', 'src', 'evals', 'runAiPlayerLiveAutonomousCombatRecoveryGate.ts')

assert.match(
  packageJson.scripts?.['gate:ai:live-autonomous-combat-recovery:soak'] ?? '',
  /runAiPlayerLiveAutonomousCombatRecoverySoakGate\.ts/,
  'package.json should expose a formal strict-budget live recovery soak gate',
)

const soakScript = readFileSync(soakScriptPath, 'utf-8')
assert.match(soakScript, /DEFAULT_DURATION_LIMIT_MS\s*=\s*120_000/, 'live recovery soak should default to a short duration window')
assert.match(soakScript, /DEFAULT_MAX_RUNS\s*=\s*2/, 'live recovery soak should cap provider runs by default')
assert.match(soakScript, /DEFAULT_MIN_RUNS\s*=\s*2/, 'live recovery soak should require two recovery runs by default')
assert.match(soakScript, /secretPolicy:\s*'env_only_no_file_no_echo'/, 'soak report must keep key handling env-only and no-echo')
assert.match(soakScript, /ai_player_live_autonomous_combat_recovery_soak_gate_latest\.json/, 'soak gate should write its own latest report')
const secretPrefixPattern = new RegExp(`${'s'}${'k'}-[A-Za-z0-9]`)
assert.doesNotMatch(soakScript, secretPrefixPattern, 'soak gate source must not contain a real provider key')

const recoveryScript = readFileSync(recoveryScriptPath, 'utf-8')
assert.match(recoveryScript, /export async function runGate/, 'soak gate should reuse the existing recovery gate instead of duplicating live provider logic')
assert.match(recoveryScript, /process\.argv\[1\]\?\.endsWith\('runAiPlayerLiveAutonomousCombatRecoveryGate\.ts'\)/, 'recovery gate should only auto-run when used as the CLI entry')

console.log('[ai_player_live_autonomous_combat_recovery_soak_gate_contract] all checks passed')
