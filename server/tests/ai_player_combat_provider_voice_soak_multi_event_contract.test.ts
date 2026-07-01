import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

const command = 'npx tsx server/src/evals/runAiPlayerCombatProviderVoiceSoakGate.ts --self-test-multi-event-summary'
const result = process.platform === 'win32'
  ? spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', command], {
    cwd: process.cwd(),
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
  })
  : spawnSync('npx', ['tsx', 'server/src/evals/runAiPlayerCombatProviderVoiceSoakGate.ts', '--self-test-multi-event-summary'], {
    cwd: process.cwd(),
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 30_000,
  })

assert.equal(result.status, 0, result.stderr || result.stdout)
const payload = JSON.parse(result.stdout.trim()) as {
  ok?: boolean
  multiEventSourcesOk?: boolean
  forbiddenCopyLeakCount?: number
  requiredSources?: string[]
  coordinateDigestOk?: boolean
  coordinateDigestFallbackOk?: boolean
  coordinateDigestNeedles?: string[]
  smokeRetryDefault?: number
  godotScriptPreflightDefaultAction?: boolean
  godotParseErrorClassification?: string
}

assert.equal(payload.ok, true)
assert.equal(payload.multiEventSourcesOk, true)
assert.equal(payload.forbiddenCopyLeakCount, 1)
assert.deepEqual(payload.requiredSources, [
  'autonomous_combat_daily_summary_report',
  'autonomous_combat_siege_report',
  'autonomous_combat_incoming_attack_report',
  'autonomous_combat_defense_outcome_report',
  'autonomous_combat_war_room_report',
])
assert.equal(payload.coordinateDigestOk, true)
assert.equal(payload.coordinateDigestFallbackOk, false)
assert.deepEqual(payload.coordinateDigestNeedles, [
  '战报',
  '热点',
  '坐标',
])
assert.equal(payload.smokeRetryDefault, 1)
assert.equal(payload.godotScriptPreflightDefaultAction, true)
assert.equal(payload.godotParseErrorClassification, 'godot_parse_error')

console.log('[ai_player_combat_provider_voice_soak_multi_event_contract] ok')
