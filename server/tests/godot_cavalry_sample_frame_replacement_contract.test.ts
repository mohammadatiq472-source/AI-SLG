import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const manifest = JSON.parse(readFileSync('godot-client/assets/themes/slgclient/manifests/unit_frames_manifest.json', 'utf8'))
const replacementManifest = JSON.parse(readFileSync('godot-client/assets/themes/slgclient/replacements/exchange_bundle/manifests/unit_frames_manifest.json', 'utf8'))
const expectedDirections = ['r', 'ru', 'u', 'lu', 'l', 'ld', 'd', 'rd']
const sampleRoot = 'res://assets/themes/slgclient/current/units/cavalry_polished_sample_frames_v1'
const sampleStatus = 'cavalry_polished_sample_frames_v1'

function workspacePathFromResPath(resPath: string): string {
  assert.ok(resPath.startsWith('res://'), `expected res path: ${resPath}`)
  return join('godot-client', resPath.slice('res://'.length))
}

function assertCavalrySample(payload: any, label: string) {
  assert.ok(payload, `${label} cavalry visualType should exist`)
  assert.equal(payload.assetStatus, sampleStatus, `${label} cavalry should use the polished sample frame asset status`)
  assert.equal(payload.framesRoot, sampleRoot, `${label} cavalry should point at the polished sample frame root`)
  assert.ok(!String(payload.framesRoot ?? '').includes('qibing_frames'), `${label} cavalry framesRoot should not point at legacy qibing_frames`)

  for (const direction of expectedDirections) {
    const frames = payload.directions?.[direction]
    assert.equal(frames?.length, 10, `${label} cavalry.${direction} should expose 10 animation frames`)
    for (const frame of frames) {
      assert.equal(frame.assetStatus, sampleStatus, `${label} cavalry.${direction}.${frame.sequence} should mark polished sample source`)
      assert.ok(String(frame.texturePath ?? '').startsWith(`${sampleRoot}/`), `${label} cavalry.${direction}.${frame.sequence} should use the sample root`)
      assert.ok(!String(frame.texturePath ?? '').includes('qibing_frames'), `${label} cavalry.${direction}.${frame.sequence} should not use legacy qibing_frames`)
      assert.deepEqual(frame.size, { w: 160, h: 120 }, `${label} cavalry.${direction}.${frame.sequence} should keep the UnitMarker canvas`)
      assert.ok(existsSync(workspacePathFromResPath(frame.texturePath)), `${frame.texturePath} should exist`)
      assert.ok(existsSync(`${workspacePathFromResPath(frame.texturePath)}.import`), `${frame.texturePath}.import should exist`)
    }
  }
}

assertCavalrySample(manifest.visualTypes?.cavalry, 'current manifest')
assertCavalrySample(replacementManifest.visualTypes?.cavalry, 'replacement manifest')

console.log('[godot_cavalry_sample_frame_replacement_contract] all checks passed')
