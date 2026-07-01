import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const settingsPanelSource = readFileSync('godot-client/scripts/ui/settings_panel.gd', 'utf-8')
const nativeShellSource = readFileSync('godot-client/scripts/ui/native_slg_shell.gd', 'utf-8')

function assertIncludes(source: string, token: string, message: string) {
  assert.ok(source.includes(token), message)
}

assertIncludes(
  nativeShellSource,
  '@onready var _settings_button: Button',
  'NativeSlgShell must keep a real SettingsButton owner instead of a baked/static image',
)
assertIncludes(
  nativeShellSource,
  '_register_city_action_button(_settings_button, "settings", CITY_ACTION_SURFACE_MAIN_NAV)',
  'Settings entry must remain a registered city action button',
)
assertIncludes(
  nativeShellSource,
  '_settings_button.visible = true',
  'Settings entry must remain player-visible in the shell',
)
assertIncludes(
  nativeShellSource,
  '_settings_button.disabled = false',
  'Settings entry must remain clickable/available in the shell',
)
assertIncludes(
  nativeShellSource,
  '_apply_city_action_button_copy(_settings_button, "settings")',
  'Settings entry label must continue flowing through shell copy owner',
)
assertIncludes(
  settingsPanelSource,
  'class_name SettingsPanel',
  'SettingsPanel owner must stay explicit',
)
assertIncludes(
  settingsPanelSource,
  'summary["settingsForbiddenEngineeringCopyCount"] = _settings_forbidden_engineering_copy_count()',
  'SettingsPanel must keep a visible-copy engineering-term guard summary',
)
assertIncludes(
  settingsPanelSource,
  'summary["settingsActionRowButtonVisibleCount"] = action_button_meta.size()',
  'SettingsPanel must expose real visible action-row button count',
)
assertIncludes(
  settingsPanelSource,
  'summary["settingsActionRowButtonMissingMetaCount"] = _settings_count_action_button_missing_meta(action_button_meta)',
  'SettingsPanel must protect future settings action rows with metadata completeness checks',
)

assert.ok(
  !settingsPanelSource.includes('ConfigFile.new()') &&
    !settingsPanelSource.includes('.save(') &&
    !settingsPanelSource.includes('.load(') &&
    !settingsPanelSource.includes('settings_durable_save_verified') &&
    !settingsPanelSource.includes('settings_restart_readback_verified'),
  'SettingsPanel source contract must not claim durable settings save/readback until a future wiring gate exists',
)

for (const forbiddenVisibleTerm of [
  'backend',
  'contract',
  'read model',
  'authority',
  'tier',
  '.env',
  'raw enum',
  'snake_case',
]) {
  assert.equal(
    settingsPanelSource.includes(`"${forbiddenVisibleTerm}"`),
    false,
    `SettingsPanel must not add quoted player-copy leakage term: ${forbiddenVisibleTerm}`,
  )
}

for (const protectedTerm of ['API Key', 'provider', '供应商', '后端未连接']) {
  assert.ok(
    settingsPanelSource.includes(`"${protectedTerm}"`),
    `SettingsPanel forbidden-copy guard must continue covering ${protectedTerm}`,
  )
}

assert.ok(
  settingsPanelSource.includes('"开发中"') && settingsPanelSource.includes('"占位"') && settingsPanelSource.includes('"待接入"'),
  'SettingsPanel forbidden-copy guard must continue rejecting debug-like placeholder copy',
)

console.log('[godot_settings_persistence_boundary_contract] all checks passed')
