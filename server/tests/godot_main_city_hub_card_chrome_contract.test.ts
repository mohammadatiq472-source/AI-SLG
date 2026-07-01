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
  const nextFunc = source.indexOf('\nfunc ', start + signature.length);
  const nextStaticFunc = source.indexOf('\nstatic func ', start + signature.length);
  const candidates = [nextFunc, nextStaticFunc].filter((index) => index > start);
  const end = candidates.length > 0 ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
};

const token = 'main_city_hub_card_chrome_v1';

const factorySource = readSource('godot-client/scripts/ui/slg_ui_component_factory.gd');
const hubOverlaySource = readSource('godot-client/scripts/ui/main_city_hub_overlay.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const buildViewSource = functionSource(hubOverlaySource, 'func _build_view() -> void:');
const buildContextPanelSource = functionSource(hubOverlaySource, 'func _build_context_panel() -> void:');
const buildGatewaySource = functionSource(hubOverlaySource, 'func _build_city_space_gateway() -> Control:');
const summarySource = functionSource(hubOverlaySource, 'func get_context_summary() -> Dictionary:');

assert.ok(
    factorySource.includes(`const MAIN_CITY_HUB_CARD_CHROME_TOKEN := "${token}"`) &&
    factorySource.includes('static func main_city_hub_card_chrome_token() -> String:') &&
    factorySource.includes('static func apply_main_city_hub_card_chrome_summary(summary: Dictionary') &&
    factorySource.includes('static func apply_main_city_hub_card_chrome(target: Control'),
  'factory must expose stable main-city hub card chrome token, style helper, and summary helper.',
);

for (const [source, label] of [
  [buildViewSource, 'world-entry popover'],
  [buildContextPanelSource, 'context panel'],
  [buildGatewaySource, 'city-space stage'],
] as const) {
  assert.ok(
    source.includes('UI_COMPONENT_FACTORY.apply_main_city_hub_card_chrome(') &&
      source.includes('set_meta("main_city_hub_card_chrome_token"'),
    `main city ${label} must consume shared hub card chrome and expose metadata.`,
  );
}

for (const field of [
  '"mainCityHubCardChromeToken"',
  '"mainCityHubCardChromeMode"',
  '"mainCityHubCardChromeSharedFactory"',
  '"mainCityHubCardChromeNodeCount"',
  '"mainCityHubCardChromeRadius"',
]) {
  assert.ok(summarySource.includes(field), `hub summary must expose ${field}.`);
}

assert.ok(
  visualSmokeSource.includes('"world_open_main_city_hub"') &&
    visualSmokeSource.includes('"mainCityHubCardChromeToken"') &&
    visualSmokeSource.includes('"mainCityHubCardChromeNodeCount"'),
  'world_open_main_city_hub formal visual smoke must require hub card chrome fields.',
);

assert.ok(
  closureBatchSource.includes('mainCityHubCardChromeToken!=main_city_hub_card_chrome_v1') &&
    closureBatchSource.includes('mainCityHubCardChromeSharedFactory!=true') &&
    closureBatchSource.includes('mainCityHubCardChromeNodeCount<3'),
  'closure batch must reject main city hub screens without shared card chrome.',
);

console.log('[godot_main_city_hub_card_chrome_contract] all checks passed');
