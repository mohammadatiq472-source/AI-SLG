import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const source = fs.readFileSync(
  path.join(repoRoot, 'godot-client/scripts/map/ai_map_intent_marker.gd'),
  'utf8',
)

const start = source.indexOf('func _load_living_activity_marker_family_texture(path_value: String) -> Texture2D:')
const end = source.indexOf('\nfunc ', start + 1)
const loaderSource = start >= 0 && end > start ? source.slice(start, end) : ''

assert.ok(loaderSource.includes('normalized_path.ends_with(".png")'), 'marker texture loader must special-case PNG files.')
assert.ok(
  loaderSource.indexOf('ImageTexture.create_from_image') < loaderSource.indexOf('ResourceLoader.exists'),
  'marker texture loader must try direct Image PNG loading before ResourceLoader import-cache loading.',
)
assert.ok(
  loaderSource.includes('ResourceLoader.exists(normalized_path)'),
  'marker texture loader should keep the existing ResourceLoader path as fallback for imported resources.',
)

console.log('[godot_ai_living_activity_marker_texture_loader_contract] all checks passed')
