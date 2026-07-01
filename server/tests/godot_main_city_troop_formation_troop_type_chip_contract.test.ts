import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string) {
  assert.ok(source.includes(token), `${label} should include ${token}`)
}

const hubOverlay = readUtf8('godot-client/scripts/ui/main_city_hub_overlay.gd')
const visualSmokeRunner = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')
const closureBatchRunner = readUtf8('godot-client/tools/run_mainline_ui_closure_batch.py')

const troopChipToken = 'troop_formation_troop_type_chip_v1'
const detailAction = 'world_click_main_city_node_troop_assign_preview_open_first_team'

assertIncludes(
  hubOverlay,
  `const TROOP_FORMATION_TROOP_TYPE_CHIP_TOKEN := "${troopChipToken}"`,
  'main city troop formation detail should own a stable troop-type chip token',
)
assertIncludes(
  hubOverlay,
  'func _build_troop_formation_troop_type_chip(slot: Dictionary, compact: bool) -> Control:',
  'main city troop formation detail should render a dedicated troop-type chip',
)
assertIncludes(
  hubOverlay,
  'TroopFormationTroopTypeChip_',
  'troop-type chip nodes should have a stable name prefix for rendered smoke checks',
)
assertIncludes(
  hubOverlay,
  'troop_formation_troop_type_chip_token',
  'troop-type chip nodes should expose the contract token as metadata',
)
assertIncludes(
  hubOverlay,
  'troop_formation_troop_type',
  'troop-type chip nodes should expose the troop type as metadata',
)
assertIncludes(
  hubOverlay,
  'troop_formation_visual_type',
  'troop-type chip nodes should expose the manifest visual type as metadata',
)
assertIncludes(
  hubOverlay,
  'troopFormationTroopTypeChipToken',
  'visual smoke summary should expose the troop-type chip contract token',
)
assertIncludes(
  hubOverlay,
  'troopFormationTroopTypeChipCount',
  'visual smoke summary should expose rendered troop-type chip count',
)
assertIncludes(
  hubOverlay,
  'troopFormationTroopTypeChipLabels',
  'visual smoke summary should expose rendered troop-type chip labels',
)
assertIncludes(
  hubOverlay,
  'troopFormationTroopTypeChipVisualTypes',
  'visual smoke summary should expose rendered troop-type chip visual types',
)

assertIncludes(
  visualSmokeRunner,
  `"${detailAction}"`,
  'formal visual smoke should keep the first-team formation detail action',
)
assertIncludes(
  visualSmokeRunner,
  'troopFormationTroopTypeChipToken',
  'formal visual smoke should assert the troop-type chip token',
)
assertIncludes(
  visualSmokeRunner,
  'troopFormationTroopTypeChipCount',
  'formal visual smoke should assert rendered troop-type chip count',
)
assertIncludes(
  visualSmokeRunner,
  'troopFormationTroopTypeChipLabels',
  'formal visual smoke should assert rendered troop-type chip labels',
)
assertIncludes(
  closureBatchRunner,
  'troopFormationTroopTypeChipToken',
  'closure batch should assert the troop-type chip token',
)
assertIncludes(
  closureBatchRunner,
  'troopFormationTroopTypeChipCount',
  'closure batch should assert rendered troop-type chip count',
)
assertIncludes(
  closureBatchRunner,
  'troopFormationTroopTypeChipLabels',
  'closure batch should assert rendered troop-type chip labels',
)
