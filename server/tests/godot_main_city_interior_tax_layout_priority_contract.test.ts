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

const interiorPanelSource = readSource('godot-client/scripts/ui/interior_panel.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const taxPageBuilder = functionSource(
  interiorPanelSource,
  'func _build_tax_treasury_page_view(section_def: Dictionary) -> Control:',
);
const taxTimelineBuilder = functionSource(
  interiorPanelSource,
  'func _build_tax_timeline_panel() -> Control:',
);
const taxSummary = functionSource(
  interiorPanelSource,
  'func _apply_tax_treasury_summary(summary: Dictionary) -> void:',
);

assert.ok(
  interiorPanelSource.includes(
    'const INTERIOR_TAX_TREASURY_LAYOUT_PRIORITY_TOKEN := "interior_tax_treasury_layout_priority_v1"',
  ),
  'interior tax page must expose a stable layout-priority token.',
);

assert.ok(
  taxPageBuilder.includes('vbox.alignment = BoxContainer.ALIGNMENT_BEGIN') &&
    taxPageBuilder.includes('_build_tax_timeline_panel()') &&
    !taxPageBuilder.includes('vbox.alignment = BoxContainer.ALIGNMENT_CENTER'),
  'tax treasury page must stop vertically centering a single large timeline panel that leaves weak top priority.',
);

assert.ok(
  taxTimelineBuilder.includes('panel.custom_minimum_size = Vector2(0, 430)') &&
    taxTimelineBuilder.includes('row.alignment = BoxContainer.ALIGNMENT_CENTER'),
  'tax timeline panel must use a tighter primary-focus height while keeping the horizontal dayline centered.',
);

for (const requiredSummaryField of [
  '"interiorTaxTreasuryLayoutPriorityToken"',
  '"interiorTaxTreasuryTimelineVerticalMode"',
  '"interiorTaxTreasuryPrimaryNodeRole"',
  '"interiorTaxTreasuryTimelinePanelMinHeight"',
  '"interiorTaxTreasuryTopVoidGuard"',
]) {
  assert.ok(
    taxSummary.includes(requiredSummaryField),
    `tax summary must expose ${requiredSummaryField} for the formal layout-priority gate.`,
  );
}

assert.ok(
  taxSummary.includes('"interiorTaxTreasuryLayoutPriorityToken"] = INTERIOR_TAX_TREASURY_LAYOUT_PRIORITY_TOKEN') &&
    taxSummary.includes('"interiorTaxTreasuryHeroLayoutMode"] = "timeline_centered_primary_node_v2"') &&
    taxSummary.includes('"interiorTaxTreasuryTimelineVerticalMode"] = "upper_midline_no_top_void_v1"') &&
    taxSummary.includes('"interiorTaxTreasuryHeroPanelVerticalMode"] = "primary_timeline_focus_band_v1"') &&
    taxSummary.includes('"interiorTaxTreasuryPrimaryNodeRole"] = "primary_collect_center"') &&
    taxSummary.includes('"interiorTaxTreasuryTimelinePanelMinHeight"] = 430') &&
    taxSummary.includes('"interiorTaxTreasuryTopVoidGuard"] = "single_panel_not_bottom_anchored_v1"'),
  'tax summary must move from timeline-only/bottom-heavy proof to a primary collect center layout contract.',
);

assert.ok(
  !taxSummary.includes('"interiorTaxTreasuryHeroLayoutMode"] = "timeline_only_v1"') &&
    !taxSummary.includes('"interiorTaxTreasuryHeroPanelVerticalMode"] = "removed_for_timeline_v1"'),
  'tax summary must not keep the old timeline-only hero layout as the current passing contract.',
);

for (const requiredSmokeField of [
  '"interiorTaxTreasuryLayoutPriorityToken"',
  '"interiorTaxTreasuryTimelineVerticalMode"',
  '"interiorTaxTreasuryPrimaryNodeRole"',
  '"interiorTaxTreasuryTopVoidGuard"',
]) {
  assert.ok(
    visualSmokeSource.includes('"world_open_main_city_interior_tax"') &&
      visualSmokeSource.includes(requiredSmokeField),
    `world_open_main_city_interior_tax visual smoke must require ${requiredSmokeField}.`,
  );
}

assert.ok(
  closureBatchSource.includes('INTERIOR_TAX_TREASURY_LAYOUT_PRIORITY_TOKEN = "interior_tax_treasury_layout_priority_v1"') &&
    closureBatchSource.includes('interiorTaxTreasuryLayoutPriorityToken!=interior_tax_treasury_layout_priority_v1') &&
    closureBatchSource.includes('interiorTaxTreasuryHeroLayoutMode!=timeline_centered_primary_node_v2') &&
    closureBatchSource.includes('interiorTaxTreasuryTimelineVerticalMode!=upper_midline_no_top_void_v1') &&
    closureBatchSource.includes('interiorTaxTreasuryHeroPanelVerticalMode!=primary_timeline_focus_band_v1') &&
    closureBatchSource.includes('interiorTaxTreasuryPrimaryNodeRole!=primary_collect_center') &&
    closureBatchSource.includes('interiorTaxTreasuryTimelinePanelMinHeight<430') &&
    closureBatchSource.includes('interiorTaxTreasuryTopVoidGuard!=single_panel_not_bottom_anchored_v1'),
  'closure batch must reject tax screens that regress to the old bottom-heavy timeline-only layout.',
);

console.log('[godot_main_city_interior_tax_layout_priority_contract] all checks passed');
