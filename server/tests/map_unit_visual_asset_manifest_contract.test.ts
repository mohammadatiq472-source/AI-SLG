import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const manifest = JSON.parse(readFileSync('godot-client/assets/themes/slgclient/manifests/unit_frames_manifest.json', 'utf8'))
const replacementManifest = JSON.parse(readFileSync('godot-client/assets/themes/slgclient/replacements/exchange_bundle/manifests/unit_frames_manifest.json', 'utf8'))
const visualTypes = manifest.visualTypes ?? {}
const replacementVisualTypes = replacementManifest.visualTypes ?? {}
const expectedDirections = ['r', 'ru', 'u', 'lu', 'l', 'ld', 'd', 'rd']
const flagManifestPath = 'godot-client/assets/themes/slgclient/current/units/flags/flag_atlas_manifest.json'

function workspacePathFromResPath(resPath: string): string {
  assert.ok(resPath.startsWith('res://'), `expected res path: ${resPath}`)
  return join('godot-client', resPath.slice('res://'.length))
}

for (const visualType of ['infantry', 'archer']) {
  const payload = visualTypes[visualType]
  assert.ok(payload, `${visualType} visualType should exist`)
  assert.equal(payload.assetStatus, 'ai_sprite_sheet_v1', `${visualType} should use the AI sprite sheet asset pipeline`)
  assert.equal(typeof payload.spriteSheetPath, 'string', `${visualType} should expose spriteSheetPath`)
  assert.ok(existsSync(workspacePathFromResPath(payload.spriteSheetPath)), `${visualType} sprite sheet should exist`)

  for (const direction of expectedDirections) {
    const frames = payload.directions?.[direction]
    assert.equal(frames?.length, 10, `${visualType}.${direction} should expose 10 animation frames`)
    for (const frame of frames) {
      assert.equal(frame.assetStatus, 'ai_sprite_sheet_v1', `${visualType}.${direction}.${frame.sequence} should mark AI sheet source`)
      assert.ok(existsSync(workspacePathFromResPath(frame.texturePath)), `${frame.texturePath} should exist`)
    }
  }
}

assert.equal(replacementManifest.schemaVersion, manifest.schemaVersion, 'replacement unit manifest should stay on the current v2 schema')
assert.deepEqual(replacementManifest.directions, manifest.directions, 'replacement unit manifest top-level directions should match current manifest')
assert.deepEqual(
  replacementVisualTypes.cavalry?.directions,
  visualTypes.cavalry?.directions,
  'replacement cavalry visualType directions should match current manifest'
)

assert.ok(existsSync(flagManifestPath), 'unit flag atlas manifest should exist')
const flagManifest = JSON.parse(readFileSync(flagManifestPath, 'utf8'))
assert.equal(flagManifest.schemaVersion, 2, 'flag atlas manifest should use final atlas schema version')
assert.equal(flagManifest.kind, 'unit_flag_atlas', 'flag atlas manifest kind should be explicit')
assert.equal(flagManifest.assetStatus, 'final_flag_atlas_v2', 'flag atlas should point to final art v2')
assert.equal(typeof flagManifest.atlasPath, 'string', 'flag atlas should expose atlasPath')
assert.ok(existsSync(workspacePathFromResPath(flagManifest.atlasPath)), 'flag atlas png should exist')
assert.deepEqual(flagManifest.frameSize, { width: 64, height: 64 }, 'final flag atlas should use 64x64 frames')

const expectedFlagKeys = ['blue', 'green', 'red', 'yellow', 'purple', 'neutral']
for (const flagKey of expectedFlagKeys) {
  const flag = flagManifest.flags?.[flagKey]
  assert.ok(flag, `flag atlas should expose ${flagKey}`)
  assert.equal(flag.assetStatus, 'final_flag_atlas_v2', `${flagKey} flag should mark final atlas source`)
  assert.equal(typeof flag.atlasIndex, 'number', `${flagKey} flag should expose atlasIndex`)
  assert.equal(typeof flag.atlasRect?.x, 'number', `${flagKey} flag should expose atlasRect.x`)
  assert.equal(typeof flag.atlasRect?.y, 'number', `${flagKey} flag should expose atlasRect.y`)
  assert.equal(flag.atlasRect?.width, 64, `${flagKey} flag atlasRect width should match final frame`)
  assert.equal(flag.atlasRect?.height, 64, `${flagKey} flag atlasRect height should match final frame`)
  assert.equal(typeof flag.tintable, 'boolean', `${flagKey} flag should declare tintable`)
}

console.log('[map_unit_visual_asset_manifest_contract] all checks passed')
