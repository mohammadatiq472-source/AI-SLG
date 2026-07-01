import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const scene = readFileSync('godot-client/scenes/app/main.tscn', 'utf-8')
const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')

function assertIncludes(source: string, needle: string, message: string) {
  assert.ok(source.includes(needle), message)
}

assertIncludes(scene, 'TileActionHudTitleLabel', 'MainMapCellActionPanel must expose a player-facing tile HUD title label.')
assertIncludes(scene, 'TileActionHudCoordinateLabel', 'Tile HUD must expose a coordinate label that is not an internal id.')
assertIncludes(scene, 'TileActionHudYieldLabel', 'Tile HUD must expose resource yield or backed reward copy.')
assertIncludes(scene, 'TileActionHudDefenderLabel', 'Tile HUD must expose defender strength copy.')
assertIncludes(scene, 'TileActionHudTroopLabel', 'Tile HUD must expose defender troop count copy.')
assertIncludes(scene, 'TileExpeditionButton', 'Tile HUD must expose a real expedition Button.')
assertIncludes(scene, 'TileActionHudFeedbackLabel', 'Tile HUD must expose short settlement feedback copy.')

assertIncludes(main, 'MAIN_MAP_TILE_EXPEDITION_BUTTON_PATH', 'main.gd must bind the expedition button node.')
assertIncludes(main, '_on_main_map_tile_expedition_pressed', 'main.gd must handle the real expedition button press.')
assertIncludes(main, '_build_world_tile_action_hud_summary', 'main.gd must expose a formal tile HUD summary.')
assertIncludes(main, 'worldTileActionHudScope', 'summary must declare this is a narrow tile-action HUD slice.')
assertIncludes(main, 'tile_action_hud_expedition_minimal_only_not_full_map_redesign', 'summary must not claim a full map redesign.')

console.log('[godot_tile_action_hud_fixture_contract] all checks passed')
