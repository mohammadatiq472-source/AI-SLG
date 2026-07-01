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

const factorySource = readSource('godot-client/scripts/ui/slg_ui_component_factory.gd');
const interiorPanelSource = readSource('godot-client/scripts/ui/interior_panel.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const marketCardStyle = functionSource(
  factorySource,
  'static func apply_interior_market_overview_card_style(panel: Control, emphasized: bool = false) -> void:',
);
const marketSummary = functionSource(
  interiorPanelSource,
  'func _apply_market_overview_summary(summary: Dictionary, text_block_count: int) -> void:',
);
const tradeSummary = functionSource(
  interiorPanelSource,
  'func _apply_trade_exchange_summary(summary: Dictionary) -> void:',
);
const taxSummary = functionSource(
  interiorPanelSource,
  'func _apply_tax_treasury_summary(summary: Dictionary) -> void:',
);

assert.ok(
  factorySource.includes(
    'const INTERIOR_SECONDARY_CARD_CHROME_CONVERGENCE_TOKEN := "interior_secondary_card_chrome_convergence_v1"',
  ) &&
    factorySource.includes('static func interior_secondary_card_chrome_convergence_token() -> String:') &&
    factorySource.includes('static func apply_interior_secondary_card_chrome_summary(summary: Dictionary) -> void:') &&
    factorySource.includes('static func apply_interior_secondary_card_style(panel: Control, emphasized: bool = false) -> void:'),
  'factory must expose a stable generic interior secondary card chrome token, summary helper, and style helper.',
);

assert.ok(
  marketCardStyle.includes('apply_interior_secondary_card_style(panel, emphasized)') &&
    !marketCardStyle.includes('make_surface_panel_style(bg, border, 1, 6, 8, 0.18)'),
  'legacy market overview card style must delegate to the generic secondary card chrome owner instead of owning a fork.',
);

for (const requiredSummaryField of [
  '"interiorSecondaryCardChromeConvergenceToken"',
  '"interiorSecondaryCardChromeMode"',
  '"interiorSecondaryCardChromeSharedFactory"',
  '"interiorSecondaryCardChromeRadius"',
  '"interiorSecondaryCardChromeMaxBorderWidth"',
]) {
  assert.ok(
    factorySource.includes(requiredSummaryField),
    `factory secondary card chrome summary helper must expose ${requiredSummaryField}`,
  );
}

for (const [name, source] of [
  ['market overview', marketSummary],
  ['trade exchange', tradeSummary],
  ['tax treasury', taxSummary],
] as const) {
  assert.ok(
    source.includes('UI_COMPONENT_FACTORY.apply_interior_secondary_card_chrome_summary(summary)'),
    `${name} summary must consume the generic secondary card chrome summary helper.`,
  );
}

for (const action of [
  '"world_open_main_city_interior_market"',
  '"world_open_main_city_interior_trade"',
  '"world_open_main_city_interior_tax"',
]) {
  assert.ok(
    visualSmokeSource.includes(action) &&
      visualSmokeSource.includes('"interiorSecondaryCardChromeConvergenceToken"') &&
      visualSmokeSource.includes('"interiorSecondaryCardChromeMode"') &&
      visualSmokeSource.includes('"interiorSecondaryCardChromeSharedFactory"'),
    `${action} visual smoke must require generic secondary card chrome summary fields.`,
  );
}

assert.ok(
  closureBatchSource.includes('INTERIOR_SECONDARY_CARD_CHROME_CONVERGENCE_TOKEN = "interior_secondary_card_chrome_convergence_v1"') &&
    closureBatchSource.includes('interiorSecondaryCardChromeConvergenceToken!=interior_secondary_card_chrome_convergence_v1') &&
    closureBatchSource.includes('interiorSecondaryCardChromeMode!=shared_market_trade_tax_cards_v1') &&
    closureBatchSource.includes('interiorSecondaryCardChromeSharedFactory!=true') &&
    closureBatchSource.includes('interiorSecondaryCardChromeRadius<6') &&
    closureBatchSource.includes('interiorSecondaryCardChromeMaxBorderWidth<1'),
  'closure batch must reject market/trade/tax secondary pages that omit the shared secondary card chrome contract.',
);

console.log('[godot_main_city_interior_secondary_card_chrome_contract] all checks passed');
