import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string) {
  assert.ok(source.includes(token), `${label} should include ${token}`)
}

const unitViewLayer = readUtf8('godot-client/scripts/map/unit_view_layer.gd')
const unitMarker = readUtf8('godot-client/scripts/map/unit_marker.gd')
const unitPathLayer = readUtf8('godot-client/scripts/map/unit_path_layer.gd')
const mapUnitsStory = readUtf8('godot-client/scripts/dev/stories/map_units_story.gd')
const mapUnitsPayload = readUtf8('godot-client/data/ui_preview/stories/map_units_story.json')
const packageJson = readUtf8('package.json')

assertIncludes(unitMarker, 'func set_selected(', 'UnitMarker')
assertIncludes(unitMarker, '_draw_selection_frame', 'UnitMarker')
assertIncludes(unitViewLayer, 'func select_unit(', 'UnitViewLayer')
assertIncludes(unitViewLayer, 'func clear_unit_selection(', 'UnitViewLayer')
assertIncludes(unitViewLayer, 'func _unhandled_input(', 'UnitViewLayer')
assertIncludes(unitViewLayer, '_resolve_unit_countdown_text', 'UnitViewLayer')
assertIncludes(unitViewLayer, 'etaAt', 'UnitViewLayer countdown')
assertIncludes(unitViewLayer, 'estimatedArrivalAt', 'UnitViewLayer countdown')
assertIncludes(unitViewLayer, 'pathColor', 'UnitViewLayer path style')
assertIncludes(unitViewLayer, 'targetColor', 'UnitViewLayer target style')
assertIncludes(unitMarker, 'FLAG_ATLAS_MANIFEST_PATH', 'UnitMarker replaceable flag atlas')
assertIncludes(unitMarker, 'func set_formation_slots(', 'UnitMarker three-general formation slots')
assertIncludes(unitMarker, '_formation_slot_offsets', 'UnitMarker three visible formation rows')
assertIncludes(unitMarker, 'flagSource', 'UnitMarker flag atlas debug state')
assertIncludes(unitViewLayer, '_resolve_formation_slots', 'UnitViewLayer formation slot resolver')
assertIncludes(unitViewLayer, 'formationSlots', 'UnitViewLayer consumes backend mapVisual formationSlots')
assertIncludes(unitViewLayer, '_resolve_unit_label_position', 'UnitViewLayer label avoidance')
assertIncludes(unitViewLayer, 'labelAvoidanceAppliedCount', 'UnitViewLayer label avoidance debug')
assertIncludes(unitViewLayer, '_build_label_avoidance_rects', 'UnitViewLayer avoids city and target markers')
assertIncludes(unitViewLayer, '_clamp_label_position_to_viewport', 'UnitViewLayer clamps labels to screen edges')
assertIncludes(unitViewLayer, 'labelClampAppliedCount', 'UnitViewLayer label clamp debug')
assertIncludes(unitViewLayer, '_sort_unit_label_ids_by_priority', 'UnitViewLayer selected label priority')
assertIncludes(unitViewLayer, '_resolve_unit_hit_priority', 'UnitViewLayer selected unit hit priority')
assertIncludes(unitPathLayer, '_draw_path_arrowheads', 'UnitPathLayer path arrows')
assertIncludes(unitPathLayer, '_draw_arrowhead', 'UnitPathLayer path arrows')
assertIncludes(unitPathLayer, '_draw_target_marker', 'UnitPathLayer target marker')
assertIncludes(mapUnitsStory, '_apply_selected_unit', 'MapUnitsStory selected unit fixture')
assertIncludes(mapUnitsPayload, '"visualType": "infantry"', 'map units fixture infantry visual')
assertIncludes(mapUnitsPayload, '"visualType": "cavalry"', 'map units fixture cavalry visual')
assertIncludes(mapUnitsPayload, '"visualType": "archer"', 'map units fixture archer visual')
assertIncludes(mapUnitsPayload, '"formationSlots"', 'map units fixture mixed three-general visual')
assertIncludes(mapUnitsPayload, '"role": "vanguard"', 'map units fixture vanguard row')
assertIncludes(mapUnitsPayload, '"role": "center"', 'map units fixture center row')
assertIncludes(mapUnitsPayload, '"role": "camp"', 'map units fixture camp row')
assertIncludes(mapUnitsPayload, '"selectedUnitId"', 'map units fixture selected unit')
assertIncludes(packageJson, 'godot:map-unit-visual:screenshot-gate', 'package formal screenshot gate')
assert.ok(
  existsSync('godot-client/tools/validate_map_unit_visual_screenshot.py'),
  'map unit visual screenshot gate should exist',
)
assert.ok(
  existsSync('godot-client/assets/themes/slgclient/current/units/flags/flag_atlas_manifest.json'),
  'replaceable unit flag atlas manifest should exist',
)
assertIncludes(unitMarker, 'AtlasTexture.new', 'UnitMarker should read final flag atlas regions')
assertIncludes(unitMarker, '_build_flag_atlas_texture', 'UnitMarker should slice final flag atlas frames')

console.log('[map_unit_visual_godot_contract] all checks passed')
