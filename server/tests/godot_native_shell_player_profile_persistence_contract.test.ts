import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const nativeShellSource = readFileSync('godot-client/scripts/ui/native_slg_shell.gd', 'utf-8')

function assertIncludes(source: string, token: string, message: string) {
  assert.ok(source.includes(token), message)
}

assertIncludes(
  nativeShellSource,
  'const PLAYER_PROFILE_CONFIG_PATH := "user://player_profile.cfg"',
  'NativeSlgShell must keep player profile under user://player_profile.cfg, not repo/package env paths',
)
assertIncludes(
  nativeShellSource,
  'const PLAYER_PROFILE_SECTION := "player"',
  'NativeSlgShell profile ConfigFile section must stay explicit',
)
assertIncludes(
  nativeShellSource,
  'const PLAYER_DISPLAY_NAME_KEY := "display_name"',
  'NativeSlgShell profile display-name key must stay explicit',
)
assertIncludes(
  nativeShellSource,
  'const PLAYER_NAME_READY_KEY := "name_ready"',
  'NativeSlgShell profile name-ready key must stay explicit',
)
assertIncludes(
  nativeShellSource,
  'var config := ConfigFile.new()',
  'NativeSlgShell profile persistence must use Godot ConfigFile',
)
assertIncludes(
  nativeShellSource,
  'var load_err := config.load(PLAYER_PROFILE_CONFIG_PATH)',
  'NativeSlgShell must keep a source-level readback helper for player profile load',
)
assertIncludes(
  nativeShellSource,
  'return config.save(PLAYER_PROFILE_CONFIG_PATH) == OK',
  'NativeSlgShell must keep a source-level player profile save helper',
)
assertIncludes(
  nativeShellSource,
  '_show_player_name_dialog_if_needed()',
  'NativeSlgShell must keep first-run player name prompt wiring',
)
assertIncludes(
  nativeShellSource,
  '_show_player_name_dialog(false)',
  'NativeSlgShell top identity must keep the reopen/edit profile affordance',
)

assert.ok(
  !nativeShellSource.includes('PLAYER_PROFILE_CONFIG_PATH := "res://') &&
    !nativeShellSource.includes('PLAYER_PROFILE_CONFIG_PATH := ".env') &&
    !nativeShellSource.includes('PLAYER_PROFILE_CONFIG_PATH := "runtime_config'),
  'player profile persistence must not be redirected into repo resources, env files, or runtime_config',
)

console.log('[godot_native_shell_player_profile_persistence_contract] all checks passed')
