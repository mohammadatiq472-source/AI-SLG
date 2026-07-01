import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const unitFrameManifestRelativePath = 'godot-client/data/ui/sea_overseas_naval_unit_frames_manifest_v1.json'
const w10PlanRelativePath = 'docs/SEA_OVERSEAS_NAVAL_BATTLE_REPORT_AND_UNIT_FRAME_PLAN_2026_06_07.md'

function readJson(relativePath: string) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')) as Record<string, unknown>
}

function readText(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

function readObject(value: unknown, label: string): Record<string, unknown> {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} should be an object`)
  return value as Record<string, unknown>
}

function readArray(value: unknown, label: string): unknown[] {
  assert.ok(Array.isArray(value), `${label} should be an array`)
  return value
}

function assertNoCavalryManifestMutation(text: string, label: string) {
  assert.ok(!text.includes('qibing_frames'), `${label} must not reference qibing_frames`)
  assert.ok(!text.includes('rebuild_qibing_frames'), `${label} must not reference qibing rebuild tooling`)
  assert.ok(!text.includes('cavalry_polished_sample'), `${label} must not reference paused cavalry imagegen candidates`)
}

const manifestText = readText(unitFrameManifestRelativePath)
const manifest = readJson(unitFrameManifestRelativePath)

assert.equal(manifest.schemaVersion, 'sea_overseas_naval_unit_frames_manifest_v1')
assert.equal(manifest.contractId, 'sea_overseas_naval_battle_report_and_unit_frame_w10')
assert.equal(manifest.status, 'asset_brief_ready_pending_imagegen_frame_batch')

assertNoCavalryManifestMutation(manifestText, unitFrameManifestRelativePath)

const battleReportReusePolicy = readObject(manifest.battleReportReusePolicy, 'battleReportReusePolicy')
assert.equal(battleReportReusePolicy.reuseExistingBattleReportSurface, true)
assert.equal(battleReportReusePolicy.noSeparateNavalBattleReportPage, true)
assert.equal(battleReportReusePolicy.listMarkerChipId, 'maritime_report_result_chip_v1')
assert.equal(battleReportReusePolicy.detailResultChipId, 'maritime_report_result_chip_v1')
assert.equal(battleReportReusePolicy.requiredExistingSurface, 'battle_report_panel/list/detail')

const movingBodies = readArray(manifest.requiredMovingBodies, 'requiredMovingBodies').map((value, index) =>
  readObject(value, `requiredMovingBodies[${index}]`),
)
assert.ok(movingBodies.length >= 2, 'naval moving body manifest should define multiple fleet classes, not one icon only')

const directions = ['r', 'ru', 'u', 'lu', 'l', 'ld', 'd', 'rd']
for (const movingBody of movingBodies) {
  assert.equal(movingBody.assetStatus, 'imagegen_required')
  assert.equal(movingBody.directionCount, 8)
  assert.equal(movingBody.framesPerDirection, 10)
  assert.equal(movingBody.requiredFrameCount, 80)
  assert.deepEqual(movingBody.directions, directions)
  assert.ok(
    String(movingBody.targetRoot).startsWith('res://assets/themes/slgclient/current/units/naval/'),
    `${movingBody.slotId} should target the formal naval unit namespace`,
  )
  assert.ok(/no (readable )?text/.test(String(movingBody.prompt)), `${movingBody.slotId} prompt should forbid baked UI text`)
  assert.ok(
    String(movingBody.frameNamingPattern).includes('{direction}_{frameIndex}'),
    `${movingBody.slotId} should declare deterministic direction/frame naming`,
  )
}

const firstPlayableSlice = readObject(manifest.firstPlayableNavalCombatSlice, 'firstPlayableNavalCombatSlice')
assert.equal(firstPlayableSlice.sliceId, 'sea_patrol_intercept_battle_report_v1')
assert.equal(firstPlayableSlice.reusesBattleReportSurface, true)
assert.ok(
  readArray(firstPlayableSlice.minimumLoop, 'firstPlayableNavalCombatSlice.minimumLoop')
    .map(String)
    .includes('battle_report_maritime_result_chip_v1'),
  'first playable naval combat slice should end on the existing battle report maritime result chip',
)
assert.ok(
  readArray(firstPlayableSlice.notInScope, 'firstPlayableNavalCombatSlice.notInScope')
    .map(String)
    .includes('full overseas conquest'),
  'first naval combat slice must not claim full overseas conquest',
)

const oldUnitManifestText = readText('godot-client/assets/themes/slgclient/manifests/unit_frames_manifest.json')
const oldUnitManifest = JSON.parse(oldUnitManifestText) as {
  schemaVersion?: string
  visualTypes?: Record<string, unknown>
}
assert.equal(oldUnitManifest.schemaVersion, 'unit_frames_manifest_v2_visual_types')
assert.ok(oldUnitManifest.visualTypes?.infantry, 'existing land unit manifest should keep infantry')
assert.ok(oldUnitManifest.visualTypes?.cavalry, 'existing land unit manifest should keep cavalry')
assert.ok(oldUnitManifest.visualTypes?.archer, 'existing land unit manifest should keep archer')
assert.ok(!oldUnitManifestText.includes('naval_patrol'), 'W10 must not inject naval frames into the current land unit manifest')

const w10PlanText = readText(w10PlanRelativePath)
assert.ok(w10PlanText.includes('复用现有战报列表 / 详情'), 'W10 plan should state existing battle report reuse')
assert.ok(w10PlanText.includes('8 方向 x 10 帧 = 80 帧'), 'W10 plan should state the 80-frame naval moving body requirement')
assert.ok(w10PlanText.includes('不接入骑兵 imagegen manifest'), 'W10 plan should preserve the cavalry boundary')
assertNoCavalryManifestMutation(w10PlanText, w10PlanRelativePath)

console.log('[godot_sea_overseas_naval_battle_report_and_unit_frame_contract] all checks passed')
