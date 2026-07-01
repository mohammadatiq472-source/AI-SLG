import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { getMainCityInteriorReadModelResponse } from '../src/application/world/mainCityInteriorReadModel'

const repoRoot = process.cwd()

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')

const readArray = (value: unknown): unknown[] => {
  assert.ok(Array.isArray(value), 'expected array')
  return value
}

const readObject = (value: unknown): Record<string, unknown> => {
  assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value), 'expected object')
  return value as Record<string, unknown>
}

const response = getMainCityInteriorReadModelResponse({
  playerId: 'tax_six_slot_contract_player',
  cityStateId: 'tax_six_slot_contract_city',
  cityLabel: '税课试点城',
  now: new Date('2026-05-24T12:00:00.000Z'),
})
const model = response.mainCityInterior
const slots = readArray(model.tax_runtime.schedule_slots).map(readObject)

assert.equal(slots.length, 6, 'tax read model must expose six daily tax collection slots')

assert.deepEqual(
  slots.map((slot) => String(slot.slot_id)),
  [
    'dawn_market',
    'morning_tax',
    'noon_tax',
    'afternoon_patrol',
    'evening_granary',
    'night_warehouse',
  ],
  'tax slots must use stable six-slot ids for UI and closure proof',
)

assert.deepEqual(
  slots.map((slot) => String(slot.time_label)),
  ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
  'tax slots must be evenly distributed through the playable day without midnight rollover',
)

assert.deepEqual(
  slots.map((slot) => String(slot.label)),
  ['晨课', '早课', '午课', '申课', '酉课', '夜课'],
  'tax slots must use short mobile labels that fit a six-node landscape timeline',
)

assert.ok(
  slots.some((slot) => slot.state === 'collectable' && slot.collectable_now === true),
  'six-slot schedule must keep exactly one currently collectable tax node in the preview fixture',
)

for (const slot of slots) {
  assert.notEqual(slot.asset_ref, undefined, `tax slot ${slot.slot_id} must expose asset_ref`)
  assert.equal(slot.asset_path, undefined, `tax slot ${slot.slot_id} must not expose legacy asset_path`)
  assert.equal(typeof slot.remaining_sec, 'number', `tax slot ${slot.slot_id} must expose remaining_sec`)
  assert.equal(typeof slot.reward_label, 'string', `tax slot ${slot.slot_id} must expose reward_label`)
}

const interiorPanelSource = readSource('godot-client/scripts/ui/interior_panel.gd')
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py')
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py')

assert.ok(
  interiorPanelSource.includes('"interiorTaxTreasuryScheduleCadence"] = "six_daily_slots_06_21_v1"') &&
    interiorPanelSource.includes('"interiorTaxTreasuryTimelineCompactMode"] = "six_slots_compact_fit_v1"'),
  'tax UI summary must expose six-slot cadence and compact-fit timeline mode',
)

assert.ok(
  visualSmokeSource.includes('"interiorTaxTreasuryScheduleCadence"') &&
    visualSmokeSource.includes('"interiorTaxTreasuryTimelineCompactMode"'),
  'formal visual smoke must require six-slot tax cadence and compact-fit summary fields',
)

assert.ok(
  closureBatchSource.includes('interiorTaxTreasuryScheduleSlotCount!=6') &&
    closureBatchSource.includes('interiorTaxTreasuryCardIds!=dawn_market/morning_tax/noon_tax/afternoon_patrol/evening_granary/night_warehouse') &&
    closureBatchSource.includes('interiorTaxTreasuryScheduleCadence!=six_daily_slots_06_21_v1') &&
    closureBatchSource.includes('interiorTaxTreasuryTimelineCompactMode!=six_slots_compact_fit_v1'),
  'closure batch must reject old three-slot or non-compact tax schedules',
)

console.log('[main_city_interior_tax_six_slot_schedule_contract] all checks passed')
