import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const manifestRelativePath = 'godot-client/data/ui/sea_overseas_naval_art_manifest_v1.json'
const planRelativePath = 'docs/SEA_OVERSEAS_NAVAL_ART_AND_GAMEPLAY_SLICE_PLAN_2026_06_07.md'

function readJson(relativePath: string) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8')) as Record<string, unknown>
}

function readObject(value: unknown, label: string): Record<string, unknown> {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} should be an object`)
  return value as Record<string, unknown>
}

function readArray(value: unknown, label: string): unknown[] {
  assert.ok(Array.isArray(value), `${label} should be an array`)
  return value
}

function resPathToRepoPath(value: string): string {
  assert.ok(value.startsWith('res://'), `res path expected, got ${value}`)
  return path.join(repoRoot, 'godot-client', value.slice('res://'.length))
}

const manifestText = fs.readFileSync(path.join(repoRoot, manifestRelativePath), 'utf8')
const manifest = readJson(manifestRelativePath)

assert.equal(manifest.schemaVersion, 'sea_overseas_naval_art_manifest_v1')
assert.equal(manifest.contractId, 'sea_overseas_naval_art_manifest_v1')
assert.equal(manifest.status, 'asset_brief_ready_pending_imagegen')

const sourceAuthority = readObject(manifest.sourceAuthority, 'sourceAuthority')
assert.equal(sourceAuthority.w6RouteId, 'east_han_coastal_dock_to_wa_contact')
assert.equal(sourceAuthority.sourceDockId, 'east_han_coastal_dock_quanzhou')
assert.equal(sourceAuthority.overseasContactId, 'wa_contact_scoutable')
assert.equal(sourceAuthority.routeStatus, 'route_open')
assert.equal(sourceAuthority.maritimeMaskAuthority, 'read_only_mask_not_playable_authority')
assert.deepEqual(sourceAuthority.travelCost, { actionPoints: 1, food: 2 })

const existingAssets = readArray(manifest.existingAssets, 'existingAssets').map((value, index) =>
  readObject(value, `existingAssets[${index}]`),
)
const dockAsset = existingAssets.find((asset) => asset.slotId === 'dock_node_base_v1')
assert.ok(dockAsset, 'manifest should keep the existing dock node asset as the only already-available formal visual')
assert.equal(dockAsset.assetStatus, 'existing_formal_world_node')
assert.equal(dockAsset.path, 'res://assets/themes/slgclient/current/world/dock_base_v1.png')
assert.ok(fs.existsSync(resPathToRepoPath(String(dockAsset.path))), 'existing dock PNG path should resolve to a real Godot asset')

assert.ok(!manifestText.includes('unit_frames_manifest'), 'W7 sea/overseas manifest must not touch unit frame manifests')
assert.ok(!manifestText.includes('qibing_frames'), 'W7 sea/overseas manifest must not reference qibing_frames')

const hardBoundaries = readObject(manifest.hardBoundaries, 'hardBoundaries')
assert.ok(
  hardBoundaries.doesNotImplementFullNavalCombat === true &&
    hardBoundaries.doesNotImplementFleetSystem === true &&
    hardBoundaries.doesNotImplementFullOverseasConquest === true &&
    hardBoundaries.doesNotModifyCavalryImagegenManifest === true &&
    hardBoundaries.doesNotDeleteQibingFrames === true,
  'manifest should preserve W7 scope boundaries',
)

const requiredSlots = readArray(manifest.requiredImagegenSlots, 'requiredImagegenSlots').map((value, index) =>
  readObject(value, `requiredImagegenSlots[${index}]`),
)
assert.ok(requiredSlots.length >= 12, 'W7 should define a small but complete imagegen queue')

const expectedCategories = new Set([
  'fleet_icon',
  'route_state',
  'port_card',
  'overseas_contact_card',
  'region_token',
  'maritime_chip',
  'naval_battle_banner',
])
const actualCategories = new Set(requiredSlots.map((slot) => String(slot.category)))
for (const category of expectedCategories) {
  assert.ok(actualCategories.has(category), `missing required W7 asset category: ${category}`)
}

for (const slot of requiredSlots) {
  assert.equal(slot.assetStatus, 'imagegen_required', `${slot.slotId} should remain an imagegen-required slot`)
  assert.ok(
    String(slot.targetPath).startsWith('res://assets/themes/slgclient/current/ui/sea_overseas/'),
    `${slot.slotId} should target the sea_overseas UI asset namespace`,
  )
  assert.ok(
    /no (readable )?text/.test(String(slot.prompt)),
    `${slot.slotId} prompt should forbid baked UI text`,
  )
}

const regionTokens = readArray(manifest.regionStateTokens, 'regionStateTokens').map((value, index) =>
  readObject(value, `regionStateTokens[${index}]`),
)
const stateByRegion = new Map(regionTokens.map((token) => [String(token.regionId), String(token.state)]))
assert.equal(stateByRegion.get('wa_islands'), 'route_open')
assert.equal(stateByRegion.get('nanyang_islands'), 'locked')
assert.equal(stateByRegion.get('india_trade_direction'), 'locked')
assert.equal(stateByRegion.get('western_regions'), 'locked')

const nextPlayableSlice = readObject(manifest.nextPlayableSlice, 'nextPlayableSlice')
assert.equal(nextPlayableSlice.sliceId, 'sea_patrol_scout_report_v1')
assert.ok(String(nextPlayableSlice.goal).includes('dock -> sea patrol/scout -> maritime report'))
assert.deepEqual(readArray(nextPlayableSlice.notInScope, 'nextPlayableSlice.notInScope'), [
  'full naval combat',
  'fleet inventory system',
  'full Japan conquest',
  'full India conquest',
  'full Southeast Asia conquest',
])

const requiredContracts = readArray(nextPlayableSlice.requiredContracts, 'nextPlayableSlice.requiredContracts').map(String)
assert.ok(requiredContracts.includes('world_sea_patrol_scout_authority_contract'))
assert.ok(requiredContracts.includes('ai_player_maritime_activity_chip_contract'))
assert.ok(requiredContracts.includes('battle_report_maritime_result_chip_contract'))
assert.ok(requiredContracts.includes('godot_sea_patrol_report_visual_smoke'))

const requiredSurfaces = readArray(nextPlayableSlice.requiredUiSurfaces, 'nextPlayableSlice.requiredUiSurfaces').map(String)
assert.ok(requiredSurfaces.includes('main_world_sea_route_status'))
assert.ok(requiredSurfaces.includes('ai_activity_card_maritime_chip'))
assert.ok(requiredSurfaces.includes('battle_report_maritime_result'))
assert.ok(requiredSurfaces.includes('overseas_contact_card'))

assert.ok(fs.existsSync(path.join(repoRoot, planRelativePath)), 'W7 should persist the naval art and gameplay slice plan doc')

console.log('[godot_sea_overseas_asset_manifest_contract] all checks passed')
