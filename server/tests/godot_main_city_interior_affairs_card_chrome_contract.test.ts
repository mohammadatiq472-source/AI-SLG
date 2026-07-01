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
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const workOrderCardBuilder = functionSource(
  interiorPanelSource,
  'func _build_construction_work_order_card(work_order: Dictionary) -> Control:',
);
const emptyCardBuilder = functionSource(
  interiorPanelSource,
  'func _build_construction_work_order_empty_card() -> Control:',
);
const selectionStyleSource = functionSource(
  interiorPanelSource,
  'func _apply_work_order_card_selection_style(card: PanelContainer, is_selected: bool) -> void:',
);
const affairsSummarySource = functionSource(
  interiorPanelSource,
  'func _apply_affairs_operations_summary(summary: Dictionary) -> void:',
);

assert.ok(
  factorySource.includes(
    'const INTERIOR_AFFAIRS_CARD_CHROME_CONVERGENCE_TOKEN := "interior_affairs_card_chrome_convergence_v1"',
  ) &&
    factorySource.includes('static func interior_affairs_card_chrome_convergence_token() -> String:') &&
    factorySource.includes('static func apply_interior_affairs_work_order_card_style(panel: Control, selected: bool = false) -> void:') &&
    factorySource.includes('static func apply_interior_affairs_card_chrome_summary(summary: Dictionary) -> void:'),
  'factory must expose a stable interior affairs card chrome convergence token plus style and summary helpers.',
);

assert.ok(
  workOrderCardBuilder.includes('apply_interior_affairs_work_order_card_style(card, is_selected)') &&
    workOrderCardBuilder.includes('card.set_meta("interior_affairs_card_chrome_convergence_token"') &&
    workOrderCardBuilder.includes('card.set_meta("interior_affairs_work_order_selected"'),
  'interior affairs work-order cards must use the converged factory chrome and expose card metadata.',
);

assert.ok(
  emptyCardBuilder.includes('apply_interior_affairs_work_order_card_style(card, false)') &&
    emptyCardBuilder.includes('card.set_meta("interior_affairs_card_chrome_convergence_token"'),
  'interior affairs empty-state card must share the same converged chrome.',
);

assert.ok(
  selectionStyleSource.includes('apply_interior_affairs_work_order_card_style(card, is_selected)') &&
    !selectionStyleSource.includes('var style := StyleBoxFlat.new()'),
  'selected work-order card chrome must delegate to the factory instead of carrying a local style fork.',
);

for (const requiredSummaryField of [
  '"interiorAffairsCardChromeConvergenceToken"',
  '"interiorAffairsCardChromeMode"',
  '"interiorAffairsCardChromeSharedFactory"',
  '"interiorAffairsCardChromeSelectedStateMode"',
  '"interiorAffairsCardChromeMaxBorderWidth"',
  '"interiorAffairsCardChromeRadius"',
]) {
  assert.ok(
    factorySource.includes(requiredSummaryField),
    `factory chrome summary helper must expose ${requiredSummaryField}`,
  );
}

assert.ok(
  affairsSummarySource.includes('UI_COMPONENT_FACTORY.apply_interior_affairs_card_chrome_summary(summary)'),
  'affairs summary must consume the shared factory chrome summary helper.',
);

assert.ok(
  visualSmokeSource.includes('"world_open_main_city_interior_affairs_press_first_action"') &&
    visualSmokeSource.includes('"world_open_main_city_interior_affairs_press_focus_action"') &&
    visualSmokeSource.includes('"interiorAffairsCardChromeConvergenceToken"') &&
    visualSmokeSource.includes('"interiorAffairsCardChromeMode"') &&
    visualSmokeSource.includes('"interiorAffairsCardChromeSelectedStateMode"'),
  'formal visual smoke entries for affairs work-order actions must require card chrome summary fields.',
);

assert.ok(
  closureBatchSource.includes('INTERIOR_AFFAIRS_CARD_CHROME_CONVERGENCE_TOKEN = "interior_affairs_card_chrome_convergence_v1"') &&
    closureBatchSource.includes('interiorAffairsCardChromeConvergenceToken!=interior_affairs_card_chrome_convergence_v1') &&
    closureBatchSource.includes('interiorAffairsCardChromeMode!=shared_mobile_work_order_cards_v1') &&
    closureBatchSource.includes('interiorAffairsCardChromeSharedFactory!=true') &&
    closureBatchSource.includes('interiorAffairsCardChromeSelectedStateMode!=single_selected_card_border_v1') &&
    closureBatchSource.includes('interiorAffairsCardChromeMaxBorderWidth<2') &&
    closureBatchSource.includes('interiorAffairsCardChromeRadius!=4'),
  'closure batch must reject interior affairs screens that regress to unverified or forked card chrome.',
);

console.log('[godot_main_city_interior_affairs_card_chrome_contract] all checks passed');
