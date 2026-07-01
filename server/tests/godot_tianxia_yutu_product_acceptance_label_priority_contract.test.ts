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

const mainSource = readSource('godot-client/scripts/app/main.gd');
const mapGridSource = readSource('godot-client/scripts/map/map_grid.gd');
const productAcceptanceSource = readSource(
  'godot-client/scripts/app/helpers/tianxia_yutu_product_acceptance_contract.gd',
);
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const densePriorityActionSource = functionSource(
  mainSource,
  'func _press_mainline_visual_smoke_tianxia_yutu_dense_label_priority_qa() -> Dictionary:',
);
const productAcceptanceActionSource = functionSource(
  mainSource,
  'func _press_mainline_visual_smoke_tianxia_yutu_product_acceptance_qa() -> Dictionary:',
);
const mapSummarySource = functionSource(
  mapGridSource,
  'func get_main_map_streaming_debug_summary() -> Dictionary:',
);

for (const requiredMapField of [
  '"tianxiaYutuLabelPriorityDrawCounts": _last_tianxia_yutu_label_priority_draw_counts.duplicate(true)',
  '"tianxiaYutuLabelPrioritySkipCounts": _last_tianxia_yutu_label_priority_skip_counts.duplicate(true)',
  '"tianxiaYutuLabelPriorityDrawOrder": _last_tianxia_yutu_label_priority_draw_order.duplicate(true)',
  '"tianxiaYutuCityLabelBudgetSkipCount": _last_tianxia_yutu_city_label_budget_skip_count',
  '"tianxiaYutuGateLabelBudgetSkipCount": _last_tianxia_yutu_gate_label_budget_skip_count',
  '"tianxiaYutuMarkerLabelDrawCounts": _last_tianxia_yutu_marker_label_draw_counts.duplicate(true)',
]) {
  assert.ok(mapSummarySource.includes(requiredMapField), `map summary is missing ${requiredMapField}`);
}

for (const requiredDenseQaNeedle of [
  'var draw_counts: Dictionary = map_summary.get("tianxiaYutuLabelPriorityDrawCounts", {})',
  'var skip_counts: Dictionary = map_summary.get("tianxiaYutuLabelPrioritySkipCounts", {})',
  'var draw_order: Array = map_summary.get("tianxiaYutuLabelPriorityDrawOrder", [])',
  'var expected_order := ["state", "selected_region", "gate", "state_government", "commandery_seat", "city", "focus"]',
  '"labelDensityReliefCount": label_density_relief_count',
  '"drawOrder": draw_order',
  '"drawCounts": draw_counts',
  '"skipCounts": skip_counts',
]) {
  assert.ok(
    densePriorityActionSource.includes(requiredDenseQaNeedle),
    `dense label priority QA is missing ${requiredDenseQaNeedle}`,
  );
}

for (const requiredProductCopy of [
  'compact_summary["tianxiaYutuLabelPriorityDrawCounts"]',
  'compact_summary["tianxiaYutuLabelPrioritySkipCounts"]',
  'compact_summary["tianxiaYutuLabelPriorityDrawOrder"]',
  'compact_summary["tianxiaYutuCityLabelBudgetSkipCount"]',
  'compact_summary["tianxiaYutuGateLabelBudgetSkipCount"]',
  'compact_summary["tianxiaYutuMarkerLabelDrawCounts"]',
  'compact_summary["tianxiaYutuLabelDensityReliefCount"]',
]) {
  assert.ok(
    productAcceptanceActionSource.includes(requiredProductCopy),
    `product acceptance action must carry ${requiredProductCopy}`,
  );
}

for (const requiredHelperNeedle of [
  'const LABEL_PRIORITY_PRODUCT_ACCEPTANCE_TOKEN: String = "tianxia_yutu_label_priority_product_acceptance_v1"',
  'var label_priority_product_acceptance_ok := _label_priority_product_acceptance_ok(compact_summary)',
  'and label_priority_product_acceptance_ok',
  'result["productAcceptanceLabelPriorityContractToken"] = LABEL_PRIORITY_PRODUCT_ACCEPTANCE_TOKEN',
  'result["productAcceptanceLabelPriorityOk"] = label_priority_product_acceptance_ok',
  'result["productAcceptanceLabelPriorityDrawCounts"]',
  'result["productAcceptanceLabelPrioritySkipCounts"]',
  'result["productAcceptanceLabelPriorityDrawOrder"]',
  'result["productAcceptanceCityLabelBudgetSkipCount"]',
  'result["productAcceptanceGateLabelBudgetSkipCount"]',
  'result["productAcceptanceMarkerLabelDrawCounts"]',
  'result["productAcceptanceLabelDensityReliefCount"]',
  'static func _label_priority_product_acceptance_ok(compact_summary: Dictionary) -> bool:',
]) {
  assert.ok(
    productAcceptanceSource.includes(requiredHelperNeedle),
    `product acceptance helper is missing ${requiredHelperNeedle}`,
  );
}

for (const closureNeedle of [
  'TIANXIA_YUTU_LABEL_PRIORITY_PRODUCT_ACCEPTANCE_TOKEN = "tianxia_yutu_label_priority_product_acceptance_v1"',
  'productAcceptanceLabelPriorityContractToken!=tianxia_yutu_label_priority_product_acceptance_v1',
  'productAcceptanceLabelPriorityOk!=true',
  'productAcceptanceLabelPriorityDrawCounts=missing',
  'productAcceptanceLabelPriorityDrawOrder<4',
  'productAcceptanceLabelDensityReliefCount<=0',
  'productAcceptanceGateLabelBudgetSkipCount<=0',
]) {
  assert.ok(closureBatchSource.includes(closureNeedle), `closure batch is missing ${closureNeedle}`);
}

console.log('[godot_tianxia_yutu_product_acceptance_label_priority_contract] all checks passed');
