import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

function functionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const next = source.indexOf('\ndef ', start + signature.length)
  return source.slice(start, next > start ? next : source.length)
}

const packageJson = read('package.json')
const visualSmokeRunner = read('godot-client/tools/run_mainline_visual_smoke.py')
const seedSource = functionSource(
  visualSmokeRunner,
  'def _seed_player_history_save_restore(args: argparse.Namespace) -> dict[str, Any]:',
)

assert.ok(
  packageJson.includes('"test:godot:player-history-save-restore-seed-auth-contract"'),
  'package.json must expose the player-history save-restore seed auth contract',
)

for (const requiredToken of [
  'join_result = _request_json(args.backend_url, "POST", "/api/session/join"',
  '"factionId": faction_id',
  '"playerName": player_name',
  'session_token = str(join_data.get("token", "")).strip()',
  'auth_headers = {"Authorization": f"Bearer {session_token}"} if session_token else None',
  'headers=auth_headers',
  'f"/api/player-history?factionId={urllib.parse.quote(faction_id)}&limit=20&eventLimit=20&civilMemoryLimit=20&replayLimit=1"',
  '"sessionTokenPresent": bool(session_token)',
]) {
  assert.ok(seedSource.includes(requiredToken), `save-restore seed must include ${requiredToken}`)
}

assert.ok(
  seedSource.includes('"/api/save-slots/save"') &&
    seedSource.includes('history_data.get("saveLoad", {})') &&
    seedSource.includes('"matchingSlot": matching_slot if isinstance(matching_slot, dict) else {}'),
  'save-restore seed must continue to seed through tooling and validate player-history saveLoad, not Godot runtime direct save-slots consumption',
)

const runtimeClient = read('godot-client/scripts/infra/http/backend_api_client.gd')
const playerHistoryPanel = read('godot-client/scripts/ui/player_history_panel.gd')
assert.equal(runtimeClient.includes('/api/save-slots'), false, 'BackendApiClient must still not expose direct save-slots routes')
assert.equal(
  functionSource(playerHistoryPanel, 'func refresh_from_backend(').includes('/api/save-slots'),
  false,
  'PlayerHistoryPanel refresh must still read /api/player-history, not direct save-slots routes',
)

console.log('[godot_player_history_save_restore_seed_auth_contract] all checks passed')
