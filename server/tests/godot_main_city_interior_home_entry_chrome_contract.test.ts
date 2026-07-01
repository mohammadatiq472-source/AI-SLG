import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const functionSource = (source: string, signature: string): string => {
  const start = source.indexOf(signature);
  if (start < 0) {
    return '';
  }
  const end = source.indexOf('\nfunc ', start + signature.length);
  return source.slice(start, end > start ? end : source.length);
};

const factorySource = readSource('godot-client/scripts/ui/slg_ui_component_factory.gd');
const interiorPanelSource = readSource('godot-client/scripts/ui/interior_panel.gd');
const mainSource = readSource('godot-client/scripts/app/main.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const homeEntryBuilder = functionSource(
  interiorPanelSource,
  'func _make_home_entry_node(entry: Dictionary) -> Control:',
);
const homeLobbySummary = functionSource(
  interiorPanelSource,
  'func _apply_home_lobby_summary(summary: Dictionary) -> void:',
);
const homeEntryIdentityPress = functionSource(
  mainSource,
  'func _press_mainline_visual_smoke_main_city_interior_home_entry_button_identity(',
);

assert.ok(
  factorySource.includes(
    'const INTERIOR_HOME_ENTRY_CHROME_CONVERGENCE_TOKEN := "interior_home_entry_chrome_convergence_v1"',
  ) &&
    factorySource.includes('static func interior_home_entry_chrome_convergence_token() -> String:') &&
    factorySource.includes('static func apply_interior_home_entry_chrome_summary(summary: Dictionary) -> void:') &&
    factorySource.includes('static func apply_interior_home_entry_badge_hit_area_style(button: Button) -> void:'),
  'factory must expose a stable interior home-entry chrome token, summary helper, and badge hit-area style helper.',
);

assert.ok(
  homeEntryBuilder.includes('root.set_meta("interior_home_entry_chrome_convergence_token"') &&
    homeEntryBuilder.includes('badge_button.set_meta("interior_home_entry_chrome_convergence_token"') &&
    homeEntryBuilder.includes('button.set_meta("interior_home_entry_chrome_convergence_token"') &&
    homeEntryBuilder.includes('UI_COMPONENT_FACTORY.apply_interior_home_entry_badge_hit_area_style(badge_button)') &&
    homeEntryBuilder.includes('UI_COMPONENT_FACTORY.apply_interior_home_entry_button_style(button)'),
  'interior home-entry root, badge hit area, and text button must consume the shared entry chrome token.',
);

for (const requiredSummaryField of [
  '"interiorHomeEntryChromeConvergenceToken"',
  '"interiorHomeEntryChromeMode"',
  '"interiorHomeEntryChromeSharedFactory"',
  '"interiorHomeEntryBadgeHitAreaMode"',
  '"interiorHomeEntryButtonLineMode"',
]) {
  assert.ok(
    factorySource.includes(requiredSummaryField),
    `factory home-entry chrome summary helper must expose ${requiredSummaryField}`,
  );
}

assert.ok(
  homeLobbySummary.includes('UI_COMPONENT_FACTORY.apply_interior_home_entry_chrome_summary(summary)'),
  'home lobby summary must consume the shared factory entry chrome summary helper.',
);

assert.ok(
  homeEntryIdentityPress.includes('clicked_chrome_token') &&
    homeEntryIdentityPress.includes('"interiorHomeEntryClickedChromeToken"') &&
    homeEntryIdentityPress.includes('clicked_chrome_token == "interior_home_entry_chrome_convergence_v1"'),
  'formal home-entry identity click must report and verify the clicked entry chrome token.',
);

assert.ok(
  visualSmokeSource.includes('"world_open_main_city_interior"') &&
    visualSmokeSource.includes('"interiorHomeEntryChromeConvergenceToken"') &&
    visualSmokeSource.includes('"interiorHomeEntryChromeMode"') &&
    visualSmokeSource.includes('"interiorHomeEntryBadgeHitAreaMode"'),
  'world_open_main_city_interior visual smoke must require home-entry chrome summary fields.',
);

assert.ok(
  closureBatchSource.includes('INTERIOR_HOME_ENTRY_CHROME_CONVERGENCE_TOKEN = "interior_home_entry_chrome_convergence_v1"') &&
    closureBatchSource.includes('interiorHomeEntryChromeConvergenceToken!=interior_home_entry_chrome_convergence_v1') &&
    closureBatchSource.includes('interiorHomeEntryChromeMode!=badge_scroll_plaque_shared_chrome_v1') &&
    closureBatchSource.includes('interiorHomeEntryChromeSharedFactory!=true') &&
    closureBatchSource.includes('interiorHomeEntryBadgeHitAreaMode!=transparent_badge_button_shared_entry_v1') &&
    closureBatchSource.includes('interiorHomeEntryClickedChromeToken!=interior_home_entry_chrome_convergence_v1'),
  'closure batch must reject home lobby or home-entry identity actions that omit shared entry chrome.',
);

console.log('[godot_main_city_interior_home_entry_chrome_contract] all checks passed');
