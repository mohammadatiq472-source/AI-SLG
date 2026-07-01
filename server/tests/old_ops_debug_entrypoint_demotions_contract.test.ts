import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function assertStatus(path: string, expectedStatus: string, requiredRoutes: string[]) {
  const text = read(path)
  assert.ok(text.includes(`2026-06-11 status: ${expectedStatus}`), `${path} should have ${expectedStatus} status header`)
  for (const route of requiredRoutes) {
    assert.ok(text.includes(route), `${path} should route to ${route}`)
  }
}

function assertDatedStatus(path: string, date: string, expectedStatus: string, requiredRoutes: string[]) {
  const text = read(path)
  assert.ok(text.includes(`${date} status: ${expectedStatus}`), `${path} should have ${expectedStatus} status header`)
  for (const route of requiredRoutes) {
    assert.ok(text.includes(route), `${path} should route to ${route}`)
  }
}

function listFiles(root: string): string[] {
  const result: string[] = []
  for (const entry of readdirSync(root)) {
    const path = `${root}/${entry}`
    const stat = statSync(path)
    if (stat.isDirectory()) {
      result.push(...listFiles(path))
    } else {
      result.push(path)
    }
  }
  return result
}

function firstLines(text: string, count = 12) {
  return text.split(/\r?\n/).slice(0, count).join('\n').toLowerCase()
}

function hasCurrentStatusGuard(path: string) {
  const head = firstLines(read(path))
  return (
    head.includes('do not use') ||
    head.includes('status:') ||
    head.includes('status：') ||
    head.includes('superseded') ||
    head.includes('stale') ||
    head.includes('reference-only') ||
    head.includes('ops-only') ||
    head.includes('historical')
  )
}

function isHistoricalEntrypointName(path: string) {
  const filename = path.split('/').pop() ?? path
  return /(?:HANDOFF|PLAN|PROMPT|DRAFT|DESIGN|设计)/i.test(filename)
}

function isCurrentAuthorityOrIndexEntrypoint(path: string) {
  return (
    path === 'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md' ||
    path.includes('/archive/') ||
    path.includes('/templates/') ||
    path.includes('/prompts/') ||
    path.startsWith('docs/PRODUCT_AUTHORITY_') ||
    path.endsWith('_CURRENT_2026_06_11.md') ||
    path.endsWith('_CURRENT_2026_06_10.md') ||
    path.endsWith('_CURRENT_2026_06_08.md') ||
    path.endsWith('_CURRENT_2026_06_06.md') ||
    path.endsWith('_CURRENT_2026_06_03.md') ||
    path.endsWith('_CURRENT_HANDOFF_2026_06_03.md')
  )
}

const discoveredLegacyEntrypointDocs = listFiles('docs')
  .filter((path) => path.endsWith('.md') || path.endsWith('.json'))
  .filter(
    (path) =>
      path.includes('CLOSEOUT_B3_') ||
      path.includes('GODOT_') ||
      path.includes('docs/modules_v2/M') ||
      path.endsWith('docs/modules_v2/module_manifest_2026_03_25.json') ||
      path.endsWith('docs/modules_v2/MODULE_COVERAGE_REPORT_2026_03_25.md'),
  )

assert.ok(discoveredLegacyEntrypointDocs.length >= 60, 'old-source discovery should cover B3/Godot/modules_v2 candidates')
const unguardedLegacyEntrypointDocs = discoveredLegacyEntrypointDocs.filter((path) => !hasCurrentStatusGuard(path))
assert.deepEqual(
  unguardedLegacyEntrypointDocs,
  [],
  'every discovered CLOSEOUT_B3/GODOT/modules_v2 source should have a top-of-file current/superseded/stale/reference/ops guard',
)

const discoveredHistoricalNamedEntrypointDocs = listFiles('docs')
  .filter((path) => path.endsWith('.md') || path.endsWith('.json'))
  .filter((path) => isHistoricalEntrypointName(path))
  .filter((path) => !isCurrentAuthorityOrIndexEntrypoint(path))

assert.ok(
  discoveredHistoricalNamedEntrypointDocs.length >= 40,
  'historical HANDOFF/PLAN/PROMPT/DRAFT/DESIGN discovery should cover the remaining old named entrypoints',
)
const unguardedHistoricalNamedEntrypointDocs = discoveredHistoricalNamedEntrypointDocs.filter((path) => !hasCurrentStatusGuard(path))
assert.deepEqual(
  unguardedHistoricalNamedEntrypointDocs,
  [],
  'every historical HANDOFF/PLAN/PROMPT/DRAFT/DESIGN source should have a top-of-file status guard or be an explicit current authority exemption',
)

const frontendAuthority = read('docs/PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md')
for (const requiredFrontendLegacyTerm of [
  'Legacy Godot Player-UI Evidence Handling',
  'docs/GODOT_PLAYABLE_STATE_AUDIT_2026_04_26.md',
  'docs/GODOT_PLAYABLE_INTEGRATION_READINESS_2026_04_28.md',
  'docs/GODOT_MAIN_CITY_CONTEXT_SMOKE_ACCEPTANCE_2026_04_29.md',
  'docs/GODOT_VISUAL_REPLACEMENT_EXECUTION_2026_04_10.md',
  'docs/GODOT_NATIVE_SHELL_LAYOUT_ALIGNMENT_2026_04_18.md',
  'docs/GODOT_MOBILE_LANDSCAPE_UI_TOUCH_TARGETS_2026_04_28.md',
  'docs/GODOT_ANDROID_DEBUG_EXPORT_INSTALL_GATE_2026_05_26.md',
  'docs/GODOT_VISUAL_CONTEXT_ANCHOR_2026_04_11.md',
  'docs/GODOT_SLG_UI_PHASE1_VALIDATION_2026_04_12.md',
  'docs/GODOT_UI_STRUCTURE_PROGRESS_SUMMARY_2026_04_19.md',
  'docs/GODOT_MAP_MACRO_COMPONENTS_2026_04_13.md',
  'docs/GODOT_MAP_SURFACE_SOURCE_AUDIT_2026_04_13.md',
  'docs/GODOT_MAP_SURFACE_GENERALPIC_PACK_2026_04_13.md',
  'docs/TASK_2026_04_05_GODOT_WEEK1_EXEC_CARDS.md',
  'current playable alpha, product completeness, or UI acceptance',
  'Android debug export/install/preflight tooling evidence',
  'close/back touch-target sizing and smoke examples',
  'historical Week 1 task cards',
  'Old `PASS`, screenshot, or `godot:mainline:visual-smoke` lines prove only the historical slice',
]) {
  assert.ok(
    frontendAuthority.includes(requiredFrontendLegacyTerm),
    `frontend authority should govern legacy Godot player-UI evidence term ${requiredFrontendLegacyTerm}`,
  )
}

for (const path of [
  'docs/AI_PLAYER_WINDOW_PROMPT_2026_04_18.md',
  'docs/AI_SLG_超大地图与AI玩家剧本设计参考.md',
  'docs/AI玩家上下文优化与身份注入设计_2026_05_05.md',
  'docs/AI玩家聊天系统与上下文架构_设计文档_2026_05_05.md',
  'docs/AI玩家视角切换_只读观察模式_设计文档_2026_05_04.md',
  'docs/AI聊天频道情感化设计_2026_05_05.md',
  'docs/AUTONOMOUS_SCALE_PLAN.md',
  'docs/EAST_HAN_REGION_BOUNDARY_RESOURCE_DESIGN_NOTES_2026_05_28.md',
  'docs/PROMPT_ARCHIVE_CANDIDATES_2026_04_11.md',
  'docs/STZB_REVERSE_DESIGN_INSIGHTS.md',
  'docs/WORLD_RESOURCE_NEW_SEASON_RESEED_DESIGN_2026_04_22.md',
  'docs/同盟系统真实状态与最小设计_2026_05_05.md',
  'docs/建筑树系统设计_2026_05_12.md',
  'docs/身份文件注入管线与微信记录提炼_设计文档_2026_05_05.md',
  'docs/部队守军资源三位一体设计_2026_05_04.md',
]) {
  assert.ok(hasCurrentStatusGuard(path), `${path} should have a top-of-file demotion guard`)
}

for (const path of [
  'docs/ACCEPTANCE_NIGHTLY_2026_03_27_0030.md',
  'docs/ACCEPTANCE_NIGHTLY_2026_03_27_0105.md',
]) {
  assertDatedStatus(path, '2026-06-12', 'archive-candidate historical acceptance snapshot', [
    'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
    'AGENTS_EXECUTION_CURRENT_2026_04.md',
    'CURRENT_HANDOFF_INDEX_2026_06_05.md',
  ])
}

for (const [path, status] of [
  ['docs/WORLD_RESOURCE_CUTOVER_RISK_TRIAGE_AND_WINDOW_SPLIT_2026_04_22.md', 'reference-only historical resource/season ops triage'],
  ['docs/WORLD_RESOURCE_DEV_PERSIST_RESET_2026_04_22.md', 'ops-only historical local-dev reset note'],
  ['docs/WORLD_RESOURCE_SEASON_CONFIG_SWITCH_2026_04_22.md', 'ops-only historical season config switch note'],
  ['docs/WORLD_RESOURCE_SEASON_CUTOVER_OPS_2026_04_22.md', 'ops-only historical season cutover note'],
  ['docs/WORLD_RESOURCE_WORKSTREAM_SPLIT_2026_04_22.md', 'reference-only historical resource workstream split'],
] as const) {
  assertDatedStatus(path, '2026-06-12', status, [
    'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
    'PRODUCT_AUTHORITY_WORLD_MAP_SUBSTRATE_CURRENT_2026_06_11.md',
    'RESOURCE_TILE_ECONOMY_AUTHORITY_CURRENT_2026_06_08.md',
    'CURRENT_HANDOFF_INDEX_2026_06_05.md',
  ])
}

for (const path of [
  'docs/CLOSEOUT_B2_C16_C17_2026_04_10.md',
  'docs/CLOSEOUT_B2_C18_2026_04_10.md',
  'docs/CLOSEOUT_B2_C19_2026_04_10.md',
  'docs/CLOSEOUT_B2_C20_2026_04_10.md',
]) {
  assertDatedStatus(path, '2026-06-12', 'ops-only historical closeout', [
    'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
    'PRODUCT_AUTHORITY_EVENT_REPLAY_SAVE_OPS_CURRENT_2026_06_11.md',
    'PRODUCT_AUTHORITY_TECH_WORKFLOW_CURRENT_2026_06_10.md',
    'CURRENT_HANDOFF_INDEX_2026_06_05.md',
  ])
}

assertDatedStatus('docs/CLOSEOUT_P4_AI_PLAYER_ANIMATION_2026_04_12.md', '2026-06-12', 'current-lane motion evidence only', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

assertDatedStatus('docs/CLOSEOUT_P5_DOCS_PR_PACKAGE_2026_04_12.md', '2026-06-12', 'reference-only historical docs package closeout', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_DOC_GOVERNANCE_CURRENT_2026_06_10.md',
  'AGENTS_EXECUTION_CURRENT_2026_04.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

assertDatedStatus('docs/CODE_SPLIT_EXEC_ACCEPTANCE_M01_M18_2026_03_26.md', '2026-06-12', 'reference-only historical split acceptance', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_TECH_WORKFLOW_CURRENT_2026_06_10.md',
  'AGENTS_EXECUTION_CURRENT_2026_04.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

for (const [path, status] of [
  ['docs/ASSET_MANIFEST_GOVERNANCE_2026_04_28.md', 'current-adjacent asset-governance evidence only'],
  ['docs/ASSET_USAGE_INDEX_2026_04_28.md', 'current-adjacent asset-usage evidence only'],
  ['docs/WORLD_STRATEGIC_NODE_ASSET_FINALIZATION_2026_04_28.md', 'current-adjacent strategic-node asset evidence only'],
] as const) {
  assertDatedStatus(path, '2026-06-12', status, [
    'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
    'PRODUCT_AUTHORITY_WORLD_MAP_SUBSTRATE_CURRENT_2026_06_11.md',
    'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
    'PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md',
    'CURRENT_HANDOFF_INDEX_2026_06_05.md',
  ])
}

assertDatedStatus('docs/RESOURCE_CELL_ART_FAILURE_LEDGER_2026_05_26.md', '2026-06-12', 'reference-only resource-cell art failure ledger', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_WORLD_MAP_SUBSTRATE_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'RESOURCE_CELL_ART_RESTART_EXECUTION_CONTRACT_2026_05_26.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

assertDatedStatus('docs/RESOURCE_CELL_ART_HARD_GATE_CHECKLIST_2026_05_26.md', '2026-06-12', 'reference-only resource-cell art hard-gate checklist', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_WORLD_MAP_SUBSTRATE_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'RESOURCE_CELL_ART_RESTART_EXECUTION_CONTRACT_2026_05_26.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

assertDatedStatus('docs/RESOURCE_CELL_ART_RESTART_EXECUTION_CONTRACT_2026_05_26.md', '2026-06-12', 'current-lane resource-cell art restart evidence only', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_WORLD_MAP_SUBSTRATE_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

assertDatedStatus('docs/WORLD_CELL_FOOTPRINT_PLACEMENT_CONTRACT_2026_04_23.md', '2026-06-12', 'current-adjacent world-cell placement evidence only', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_WORLD_MAP_SUBSTRATE_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

for (const [path, status] of [
  ['docs/WORLD_CELL_PHASE2_MAP_GRID_REVIEW_2026_04_25.md', 'reference-only world-cell phase2 map-grid review'],
  ['docs/WORLD_CELL_PHASE2_RUNTIME_BUILDER_CONSOLIDATION_2026_04_25.md', 'reference-only world-cell runtime-builder consolidation'],
] as const) {
  assertDatedStatus(path, '2026-06-12', status, [
    'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
    'PRODUCT_AUTHORITY_WORLD_MAP_SUBSTRATE_CURRENT_2026_06_11.md',
    'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
    'CURRENT_HANDOFF_INDEX_2026_06_05.md',
  ])
}

assertDatedStatus('docs/SUBAGENT_ASSET_AUDIT_2026_04_11.md', '2026-06-12', 'reference-only historical subagent asset audit', [
  'AGENTS_EXECUTION_CURRENT_2026_04.md',
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

for (const [path, status] of [
  ['docs/AI_PLAYER_ATOMIC_ACTION_CATALOG_V1_2026_04_20.md', 'current-adjacent AI-player action evidence only'],
  ['docs/AI_PLAYER_BACKEND_KNOWLEDGE_GRAPH_2026_04_20.md', 'current-adjacent AI-player backend knowledge evidence only'],
] as const) {
  assertDatedStatus(path, '2026-06-12', status, [
    'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
    'PRODUCT_AUTHORITY_AI_PLAYER_GOVERNANCE_CURRENT_2026_06_10.md',
    'PRODUCT_AUTHORITY_AI_SOCIAL_GOVERNANCE_CURRENT_2026_06_11.md',
    'CURRENT_HANDOFF_INDEX_2026_06_05.md',
  ])
}

assertDatedStatus('docs/AI_PLAYER_BACKEND_TASK_PACKAGES_2026_05_22.md', '2026-06-12', 'stale-only AI-player backend task package', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_AI_PLAYER_GOVERNANCE_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_AI_SOCIAL_GOVERNANCE_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

assertDatedStatus('docs/AI_PLAYER_PROVIDER_ACCOUNTING_AND_AI_COMMAND_CREDITS_2026_05_21.md', '2026-06-12', 'current-adjacent AI provider/accounting backend evidence only', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_AI_PLAYER_GOVERNANCE_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_AI_SOCIAL_GOVERNANCE_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

assertDatedStatus('docs/AI_PLAYER_VOICE_COMMAND_DEFERRED_2026_04_27.md', '2026-06-12', 'current-adjacent AI voice command evidence only', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_AI_PLAYER_GOVERNANCE_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

for (const [path, status] of [
  ['docs/AI_BACKEND_LOGIC_DEEP_READ_BATCH2_2026_04_09.md', 'reference-only historical AI backend deep-read audit'],
  ['docs/AI_BACKEND_RUNTIME_CONTRACT_2026_04_19.md', 'reference-only historical AI backend runtime contract'],
] as const) {
  assertDatedStatus(path, '2026-06-12', status, [
    'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
    'PRODUCT_AUTHORITY_AI_PLAYER_GOVERNANCE_CURRENT_2026_06_10.md',
    'PRODUCT_AUTHORITY_EVENT_REPLAY_SAVE_OPS_CURRENT_2026_06_11.md',
    'CURRENT_HANDOFF_INDEX_2026_06_05.md',
  ])
}

assertDatedStatus('docs/AI_PLAYER_OBSIDIAN_SESSION_NOTE_2026_04_21.md', '2026-06-12', 'reference-only historical AI backend session note', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_AI_PLAYER_GOVERNANCE_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_AI_SOCIAL_GOVERNANCE_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

for (const [path, status] of [
  ['docs/CODE_MAINLINE_KEEP_FREEZE_BRIDGE_2026_04_16.md', 'reference-only historical code-freeze bridge'],
  ['docs/NATIVE_SLG_MAINLINE_INDEX_2026_04_16.md', 'reference-only historical native-SLG mainline index snapshot'],
] as const) {
  assertDatedStatus(path, '2026-06-12', status, [
    'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
    'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
    'PRODUCT_AUTHORITY_TECH_WORKFLOW_CURRENT_2026_06_10.md',
    'CURRENT_HANDOFF_INDEX_2026_06_05.md',
  ])
}

assertDatedStatus('docs/GENERAL_SKILL_LIBRARY_RECRUIT_POOL_FINAL_2026_04_27.md', '2026-06-12', 'reference-only general-skill/recruit preview evidence', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_COMBAT_WAR_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

assertDatedStatus('docs/TASK_2026_04_14_PRODUCT_FRONTEND_EXEC_CARDS.md', '2026-06-12', 'reference-only historical product-frontend task cards', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

assertDatedStatus('docs/USB_MIGRATION_AUDIT_2026_04_17.md', '2026-06-12', 'reference-only historical migration audit', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_TECH_WORKFLOW_CURRENT_2026_06_10.md',
  'AGENTS_EXECUTION_CURRENT_2026_04.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

assertDatedStatus('docs/archive/modules_legacy_2026_03_25/MOD-15_frontend-map-rendering.md', '2026-06-12', 'archive-only legacy frontend-map module card', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_WORLD_MAP_SUBSTRATE_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

for (const [path, status] of [
  ['docs/MAINLINE_UI_ACTIVITY_COMPONENTIZATION_GOAL_2026_05_28.md', 'current-adjacent mainline UI activity evidence only'],
  ['docs/MAINLINE_UI_ART_ASSET_DELIVERY_AUDIT_2026_06_03.md', 'current-adjacent mainline UI art asset evidence only'],
  ['docs/MAINLINE_UI_PAGE_CACHE_INDEX_2026_05_20.md', 'current-adjacent mainline UI page-cache evidence only'],
  ['docs/MAINLINE_UI_REUSABLE_COMPONENT_CONTRACT_2026_05_26.md', 'current-adjacent mainline UI reusable-component evidence only'],
] as const) {
  assertDatedStatus(path, '2026-06-12', status, [
    'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
    'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
    'PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md',
    'CURRENT_HANDOFF_INDEX_2026_06_05.md',
  ])
}

assertDatedStatus('docs/MAP_UNIT_VISUAL_ASSET_SPEC_2026_06_01.md', '2026-06-12', 'current-adjacent map-unit visual asset evidence only', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_WORLD_MAP_SUBSTRATE_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

for (const [path, status] of [
  ['docs/MAIN_CITY_FACILITY_TREE_BACKEND_PAYLOAD_INTEGRATION_2026_05_24.md', 'current-adjacent main-city facility backend evidence only'],
  ['docs/MAIN_CITY_FACILITY_TREE_READ_MODEL_CONTRACT_2026_05_24.md', 'current-adjacent main-city facility read-model evidence only'],
] as const) {
  assertDatedStatus(path, '2026-06-12', status, [
    'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
    'PRODUCT_AUTHORITY_MAIN_CITY_ECONOMY_OBJECTIVES_CURRENT_2026_06_11.md',
    'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
    'CURRENT_HANDOFF_INDEX_2026_06_05.md',
  ])
}

assertDatedStatus('docs/SCENARIO_WORLD_AFFAIRS_BACKEND_CONTRACT_2026_04_30.md', '2026-06-12', 'current-adjacent world-affairs backend evidence only', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_TASK_WORLD_PROGRESS_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_PLAYER_OBJECTIVES_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

assertDatedStatus('docs/AI_PLAYER_AUTONOMOUS_DEVELOPMENT_CURRENT_2026_06_02.md', '2026-06-12', 'current-lane AI autonomous development evidence', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_AI_PLAYER_GOVERNANCE_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_AI_SOCIAL_GOVERNANCE_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

for (const path of [
  'docs/SEA_OVERSEAS_NAVAL_PATROL_INTERCEPT_SLICE_CURRENT_2026_06_07.md',
  'docs/SEA_OVERSEAS_NAVAL_PATROL_SCOUT_SLICE_CURRENT_2026_06_07.md',
  'docs/SEA_OVERSEAS_NAVAL_PATROL_VISUAL_CHIP_CURRENT_2026_06_07.md',
]) {
  assertDatedStatus(path, '2026-06-12', 'current-lane sea/naval supporting evidence only', [
    'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
    'PRODUCT_AUTHORITY_SEA_NAVAL_SUPPORTING_CURRENT_2026_06_10.md',
    'PRODUCT_AUTHORITY_COMBAT_WAR_CURRENT_2026_06_10.md',
    'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
    'CURRENT_HANDOFF_INDEX_2026_06_05.md',
  ])
}

for (const path of [
  'docs/CLOSEOUT_B3_C01_2026_04_10.md',
  'docs/CLOSEOUT_B3_C02_2026_04_10.md',
  'docs/CLOSEOUT_B3_C03_2026_04_10.md',
  'docs/CLOSEOUT_B3_C04_2026_04_10.md',
  'docs/CLOSEOUT_B3_C05_2026_04_10.md',
  'docs/CLOSEOUT_B3_C06_2026_04_10.md',
  'docs/CLOSEOUT_B3_C07_2026_04_11.md',
  'docs/CLOSEOUT_B3_C08_2026_04_11.md',
  'docs/CLOSEOUT_B3_C09_2026_04_11.md',
  'docs/CLOSEOUT_B3_C10_2026_04_11.md',
  'docs/CLOSEOUT_B3_C11_2026_04_11.md',
  'docs/CLOSEOUT_B3_C12_2026_04_11.md',
  'docs/CLOSEOUT_B3_C13_2026_04_11.md',
  'docs/CLOSEOUT_B3_C14_2026_04_11.md',
  'docs/CLOSEOUT_B3_C15_2026_04_11.md',
  'docs/CLOSEOUT_B3_C16_2026_04_11.md',
  'docs/CLOSEOUT_B3_C17_2026_04_11.md',
]) {
  assertStatus(path, 'ops-only closeout', [
    'PRODUCT_AUTHORITY_EVENT_REPLAY_SAVE_OPS_CURRENT_2026_06_11.md',
    'PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md',
    'CURRENT_HANDOFF_INDEX_2026_06_05.md',
  ])
  assert.ok(
    read(path).includes(
      'Do not use this file as current product, player-history, save/load, replay, animation, or UI authority',
    ),
    `${path} should carry a strong current-authority denial guard`,
  )
}

for (const path of [
  'docs/CLOSEOUT_B3_C18_2026_04_12.md',
  'docs/CLOSEOUT_B3_C19_2026_04_12.md',
]) {
  const text = read(path)
  assert.ok(text.includes('2026-06-11 status: ops-only docs-governance closeout'), `${path} should be ops-only docs-governance`)
  assert.ok(text.includes('PRODUCT_AUTHORITY_DOC_GOVERNANCE_CURRENT_2026_06_10.md'), `${path} should route to doc governance authority`)
}

for (const path of [
  'docs/modules_v2/M01.md',
  'docs/modules_v2/M05.md',
  'docs/modules_v2/M11.md',
  'docs/modules_v2/M12.md',
  'docs/modules_v2/M15.md',
  'docs/modules_v2/M18.md',
]) {
  const text = read(path)
  assert.ok(text.includes('Body evidence interpretation guard'), `${path} should explain body evidence interpretation`)
  assert.ok(
    text.includes('support-layer / ops route evidence only') ||
      text.includes('automation / ops route evidence only') ||
      text.includes('historical command-surface evidence only') ||
      text.includes('QA / ops evidence only'),
    `${path} should classify PASS/API/gate rows as non-product evidence`,
  )
  assert.ok(
    text.includes('not proof of') && text.includes('product completeness') && text.includes('formal'),
    `${path} should deny product-completeness proof without current authority and formal contracts`,
  )
}

for (const path of [
  'docs/modules_v2/M01.md',
  'docs/modules_v2/M02.md',
  'docs/modules_v2/M03.md',
  'docs/modules_v2/M04.md',
  'docs/modules_v2/M05.md',
  'docs/modules_v2/M08.md',
  'docs/modules_v2/M09.md',
  'docs/modules_v2/M10.md',
  'docs/modules_v2/M12.md',
  'docs/modules_v2/M13.md',
  'docs/modules_v2/M14.md',
  'docs/modules_v2/M15.md',
  'docs/modules_v2/M16.md',
  'docs/modules_v2/M17.md',
  'docs/modules_v2/M19.md',
]) {
  const text = read(path)
  assert.ok(text.includes('2026-06-11 status: superseded historical module card'), `${path} should be superseded historical module card`)
  assert.ok(
    text.includes('PRODUCT_AUTHORITY') || text.includes('CURRENT_HANDOFF_INDEX_2026_06_05.md'),
    `${path} should route to current product authority or CURRENT`,
  )
}

for (const path of ['docs/modules_v2/M06.md', 'docs/modules_v2/M07.md']) {
  const text = read(path)
  assert.ok(text.includes('Status: superseded / historical module card'), `${path} should retain previous superseded module-card header`)
}

assertStatus('docs/modules_v2/MODULE_COVERAGE_REPORT_2026_03_25.md', 'reference-only historical module coverage report', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'AGENTS_EXECUTION_CURRENT_2026_04.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

const legacyModuleManifest = JSON.parse(read('docs/modules_v2/module_manifest_2026_03_25.json')) as {
  status?: string
  currentReplacementAuthority?: string[]
  useRule?: string
}
assert.equal(
  legacyModuleManifest.status,
  'superseded historical module manifest',
  'module_manifest_2026_03_25.json should be explicitly superseded',
)
for (const route of [
  'docs/PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'docs/AGENTS_EXECUTION_CURRENT_2026_04.md',
  'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md',
]) {
  assert.ok(
    legacyModuleManifest.currentReplacementAuthority?.includes(route),
    `module_manifest_2026_03_25.json should route to ${route}`,
  )
}
assert.ok(
  legacyModuleManifest.useRule?.includes('Do not use this JSON as current ownership') &&
    legacyModuleManifest.useRule.includes('ops/debug entrypoint') &&
    legacyModuleManifest.useRule.includes('frontend/motion authority'),
  'module_manifest_2026_03_25.json should forbid current ownership, ops/debug, and frontend/motion authority use',
)

for (const path of [
  'docs/GODOT_AI_PLAYER_ANIMATION_FALLBACK_2026_04_10.md',
  'docs/GODOT_EDITOR_OPEN_FLOW_2026_04_17.md',
  'docs/GODOT_MAIN_CITY_CONTEXT_SMOKE_ACCEPTANCE_2026_04_29.md',
  'docs/GODOT_MAP_MACRO_COMPONENTS_2026_04_13.md',
  'docs/GODOT_MAP_SURFACE_GENERALPIC_PACK_2026_04_13.md',
  'docs/GODOT_MAP_SURFACE_SOURCE_AUDIT_2026_04_13.md',
  'docs/GODOT_PROVINCE_WARZONE_PREFAB_SEMANTICS_2026_04_13.md',
  'docs/GODOT_SLG_UI_PHASE1_VALIDATION_2026_04_12.md',
  'docs/GODOT_UI_STRUCTURE_PROGRESS_SUMMARY_2026_04_19.md',
  'docs/GODOT_VISUAL_CONTEXT_ANCHOR_2026_04_11.md',
]) {
  const text = read(path)
  assert.ok(text.includes('2026-06-11 status: reference-only'), `${path} should be reference-only`)
}
for (const path of [
  'docs/GODOT_VISUAL_CONTEXT_ANCHOR_2026_04_11.md',
  'docs/GODOT_SLG_UI_PHASE1_VALIDATION_2026_04_12.md',
  'docs/GODOT_UI_STRUCTURE_PROGRESS_SUMMARY_2026_04_19.md',
  'docs/GODOT_MAP_MACRO_COMPONENTS_2026_04_13.md',
  'docs/GODOT_MAP_SURFACE_SOURCE_AUDIT_2026_04_13.md',
  'docs/GODOT_MAP_SURFACE_GENERALPIC_PACK_2026_04_13.md',
  'docs/TASK_2026_04_05_GODOT_WEEK1_EXEC_CARDS.md',
]) {
  const text = read(path)
  assert.ok(text.includes('Body evidence interpretation guard'), `${path} should guard historical body evidence`)
  assert.ok(text.includes('not proof of current') || text.includes('not proof of'), `${path} should deny current product proof`)
  assert.ok(text.includes('formal player-visible contracts explicitly revalidate it'), `${path} should require formal revalidation`)
}

assertStatus('docs/GODOT_MCP_CLI_CONTROL_SURFACE_2026_04_10.md', 'ops-only historical control surface', [
  'PRODUCT_AUTHORITY_EVENT_REPLAY_SAVE_OPS_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])
assertStatus('docs/GODOT_MOBILE_LANDSCAPE_UI_TOUCH_TARGETS_2026_04_28.md', 'current-adjacent touch-target evidence', [
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
])
assert.ok(
  read('docs/GODOT_MOBILE_LANDSCAPE_UI_TOUCH_TARGETS_2026_04_28.md').includes(
    'Do not use this file as the default product/UI/motion authority',
  ) &&
    read('docs/GODOT_MOBILE_LANDSCAPE_UI_TOUCH_TARGETS_2026_04_28.md').includes(
      'Body evidence interpretation guard',
    ),
  'mobile touch-target evidence should not become default product/UI/motion authority',
)
assertStatus('docs/GODOT_SVG_ICON_SOURCE_PACK_2026_04_18.md', 'current-lane source-asset evidence', [
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
])
assert.ok(
  read('docs/GODOT_SVG_ICON_SOURCE_PACK_2026_04_18.md').includes(
    'Do not use this file as the default frontend/motion/product authority',
  ),
  'SVG source pack should not become default frontend/motion/product authority',
)
assertStatus('docs/GODOT_AI_PANEL_MOBILE_LANDSCAPE_ACCEPTANCE_2026_04_28.md', 'current-lane evidence only', [
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
])
assert.ok(
  read('docs/GODOT_AI_PANEL_MOBILE_LANDSCAPE_ACCEPTANCE_2026_04_28.md').includes(
    'Do not use this file as the default AI, player-history, motion, or product-completion entrypoint',
  ) &&
    read('docs/GODOT_AI_PANEL_MOBILE_LANDSCAPE_ACCEPTANCE_2026_04_28.md').includes(
      'Body evidence interpretation guard',
    ),
  'AI panel mobile evidence should not become default AI/player-history/motion authority',
)
assertStatus('docs/GODOT_ANDROID_DEBUG_EXPORT_INSTALL_GATE_2026_05_26.md', 'reference-only packaging/debug gate', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])
assert.ok(
  read('docs/GODOT_ANDROID_DEBUG_EXPORT_INSTALL_GATE_2026_05_26.md').includes('Body evidence interpretation guard') &&
    read('docs/GODOT_ANDROID_DEBUG_EXPORT_INSTALL_GATE_2026_05_26.md').includes('not proof of current mobile UX'),
  'Android debug export/install gate should guard packaging/tooling rows',
)
assertStatus('docs/GODOT_PLAYABLE_INTEGRATION_READINESS_2026_04_28.md', 'reference-only integration readiness', [
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
])
assert.ok(
  read('docs/GODOT_PLAYABLE_INTEGRATION_READINESS_2026_04_28.md').includes('Body evidence interpretation guard') &&
    read('docs/GODOT_PLAYABLE_INTEGRATION_READINESS_2026_04_28.md').includes('not proof of current integration completion'),
  'playable integration readiness should guard body visual-smoke/planning rows',
)
assertStatus('docs/GODOT_PLAYABLE_STATE_AUDIT_2026_04_26.md', 'reference-only playable audit', [
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md',
])
assert.ok(
  read('docs/GODOT_PLAYABLE_STATE_AUDIT_2026_04_26.md').includes('Body evidence interpretation guard') &&
    read('docs/GODOT_PLAYABLE_STATE_AUDIT_2026_04_26.md').includes('not proof of current playable alpha'),
  'playable state audit should guard body runtime/visual-smoke/screenshot rows',
)
assert.ok(
  read('docs/GODOT_MAIN_CITY_CONTEXT_SMOKE_ACCEPTANCE_2026_04_29.md').includes('Body evidence interpretation guard') &&
    read('docs/GODOT_MAIN_CITY_CONTEXT_SMOKE_ACCEPTANCE_2026_04_29.md').includes('not proof of current main-city economy authority'),
  'main-city smoke acceptance should guard body smoke/screenshot rows',
)
assertStatus('docs/GODOT_VISUAL_REPLACEMENT_EXECUTION_2026_04_10.md', 'reference-only visual execution evidence', [
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_WORLD_MAP_SUBSTRATE_CURRENT_2026_06_11.md',
])
assert.ok(
  read('docs/GODOT_VISUAL_REPLACEMENT_EXECUTION_2026_04_10.md').includes('Body evidence interpretation guard') &&
    read('docs/GODOT_VISUAL_REPLACEMENT_EXECUTION_2026_04_10.md').includes('not proof of current map substrate'),
  'visual replacement execution should guard old visual/gate/template rows',
)
assertStatus('docs/GODOT_NATIVE_SHELL_LAYOUT_ALIGNMENT_2026_04_18.md', 'stale-only native-shell layout evidence', [
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
])
assert.ok(
  read('docs/GODOT_NATIVE_SHELL_LAYOUT_ALIGNMENT_2026_04_18.md').includes('Body evidence interpretation guard') &&
    read('docs/GODOT_NATIVE_SHELL_LAYOUT_ALIGNMENT_2026_04_18.md').includes('not proof of current shell chrome'),
  'native shell layout alignment should guard old layout/video/runtime rows',
)
const battleReportSkeleton = read('docs/GODOT_BATTLE_REPORT_PANEL_SKELETON_2026_04_18.md')
assert.ok(
    battleReportSkeleton.includes('Status: current-lane evidence only') &&
    battleReportSkeleton.includes('PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md') &&
    battleReportSkeleton.includes('does not define full player history, replay, or save/load completion') &&
    battleReportSkeleton.includes(
      'Do not use this file as current replay/save-load authority, player-history model, or product-completion proof',
    ),
  'battle report skeleton should remain current-lane evidence only, not replay/save/load authority',
)

for (const path of [
  'docs/TIANXIA_YUTU_OVERLAY_AND_NATION_DRAFT_ACCEPTANCE_HANDOFF_2026_06_01.md',
  'docs/TIANXIA_YUTU_FRONTLINE_AND_NATION_SUBMIT_HANDOFF_2026_06_01.md',
]) {
  assertStatus(path, 'current-lane evidence only', [
    'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
    'PRODUCT_AUTHORITY_WORLD_MAP_SUBSTRATE_CURRENT_2026_06_11.md',
    'PRODUCT_AUTHORITY_ORGANIZATION_NATION_LADDER_CURRENT_2026_06_11.md',
    'TIANXIA_YUTU_MOBILE_AND_EXPLICIT_JUMP_CURRENT_2026_06_03.md',
  ])
}

assertStatus('docs/AI_CHAT_VOICE_PLAYBACK_VISUAL_SMOKE_HANDOFF_2026_06_02.md', 'current-lane voice smoke evidence only', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_AI_PLAYER_GOVERNANCE_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

assertStatus('docs/DEMO_VIDEO_MASTER_HANDOFF_2026_06_02.md', 'current-lane demo-readiness evidence only', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_AI_PLAYER_GOVERNANCE_CURRENT_2026_06_10.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

for (const path of [
  'docs/LEFT_TROOP_RAIL_COMMERCIAL_POLISH_HANDOFF_2026_06_03.md',
  'docs/MAINLINE_UI_ART_REPLACEMENT_WHITE_LIST_HANDOFF_2026_06_02.md',
  'docs/MAINLINE_UI_ART_ASSET_PHASED_REPLACEMENT_HANDOFF_2026_06_02.md',
]) {
  assertStatus(path, 'current-lane frontend evidence only', [
    'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
    'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
    'PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md',
  ])
}

assertStatus('docs/FORMAL_PACK_ASSET_HANDOFF_2026_04_30.md', 'reference-only asset handoff', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
])

assertStatus('docs/AI_PLAYER_AI_PANEL_UI_NEXT_WINDOW_PROMPT_2026_04_27.md', 'superseded prompt / historical AI-panel UI task pack', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_AI_PLAYER_GOVERNANCE_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

assertStatus('docs/AI_PLAYER_PROVIDER_POOL_AND_AI_PANEL_NEXT_WINDOW_PROMPT_2026_04_27.md', 'superseded prompt / ops-support task pack', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_AI_PLAYER_GOVERNANCE_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_AI_SOCIAL_GOVERNANCE_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

assertStatus('docs/MAP_UNIT_VISUAL_SYSTEM_PLAN_2026_06_01.md', 'current-lane map-unit visual evidence only', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_WORLD_MAP_SUBSTRATE_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md',
])

assertStatus('docs/MAINLINE_UI_MOTION_SYSTEM_PLAN_2026_05_28.md', 'current-lane UI motion evidence only', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md',
])

for (const path of [
  'docs/PRODUCT_AUTHORITY_DELETED_DOCS_MANIFEST_2026_06_10.md',
  'docs/DOCS_READONLY_ARCHIVE_WHITELIST_2026_06_05.md',
]) {
  const text = read(path)
  for (const required of [
    'TIANXIA_YUTU_OVERLAY_AND_NATION_DRAFT_ACCEPTANCE_HANDOFF_2026_06_01.md',
    'AI_PLAYER_PROVIDER_POOL_AND_AI_PANEL_NEXT_WINDOW_PROMPT_2026_04_27.md',
    'MAINLINE_UI_MOTION_SYSTEM_PLAN_2026_05_28.md',
  ]) {
    assert.ok(text.includes(required), `${path} should record handoff / plan / prompt demotion batch source ${required}`)
  }
}

assertStatus('docs/AI_BACKEND_RUNTIME_EXEC_PLAN_2026_04_19.md', 'ops-only historical backend runtime plan', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_AI_PLAYER_GOVERNANCE_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_EVENT_REPLAY_SAVE_OPS_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

assertStatus('docs/AI_PLAYER_WINDOW_HANDOFF_2026_04_20.md', 'superseded AI-player backend handoff', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_AI_PLAYER_GOVERNANCE_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_AI_SOCIAL_GOVERNANCE_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

assertStatus('docs/AI_SUBAGENT_LAUNCH_PROMPTS_2026_03_26.md', 'superseded prompt archive', [
  'AGENTS_EXECUTION_CURRENT_2026_04.md',
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

for (const path of [
  'docs/audit-http-api-mcp-2026-03-20.md',
  'docs/audit-shared-contracts-schemas-2026-03-20.md',
]) {
  const text = read(path)
  assert.ok(text.includes('2026-06-11 status: reference-only historical'), `${path} should be reference-only historical audit`)
  assert.ok(text.includes('PRODUCT_AUTHORITY_TECH_WORKFLOW_CURRENT_2026_06_10.md'), `${path} should route to tech workflow authority`)
  assert.ok(text.includes('CURRENT_HANDOFF_INDEX_2026_06_05.md'), `${path} should route to CURRENT`)
}

assertStatus('docs/DRILL_GROUND_TROOP_FORMATION_COMMERCIAL_HANDOFF_2026_06_03.md', 'current-lane frontend evidence only', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_MAIN_CITY_ECONOMY_OBJECTIVES_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md',
])

assertStatus('docs/DRILL_GROUND_TROOP_FORMATION_COMMERCIAL_REDESIGN_PROMPT_2026_06_02.md', 'superseded prompt archive', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_MAIN_CITY_ECONOMY_OBJECTIVES_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'DRILL_GROUND_TROOP_FORMATION_COMMERCIAL_HANDOFF_2026_06_03.md',
])

for (const path of [
  'docs/RESOURCE_CELL_ART_NEW_WINDOW_HANDOFF_2026_05_26.md',
  'docs/RESOURCE_CELL_ART_NEW_WINDOW_HANDOFF_2026_05_27.md',
]) {
  assertStatus(path, 'reference-only resource-cell art failure/prototype handoff', [
    'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
    'PRODUCT_AUTHORITY_WORLD_MAP_SUBSTRATE_CURRENT_2026_06_11.md',
    'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
    'RESOURCE_CELL_ART_RESTART_EXECUTION_CONTRACT_2026_05_26.md',
  ])
}

assertStatus('docs/SEA_OVERSEAS_NAVAL_ART_AND_GAMEPLAY_SLICE_PLAN_2026_06_07.md', 'current-lane sea/naval supporting evidence only', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_SEA_NAVAL_SUPPORTING_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_WORLD_MAP_SUBSTRATE_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
])

assertStatus('docs/SEA_OVERSEAS_NAVAL_BATTLE_REPORT_AND_UNIT_FRAME_PLAN_2026_06_07.md', 'current-lane sea/naval supporting evidence only', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_SEA_NAVAL_SUPPORTING_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_COMBAT_WAR_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md',
])

assertStatus('docs/MAINLINE_UI_LEFT_TROOP_RAIL_ICON_ASSET_PLAN_2026_06_01.md', 'current-lane frontend asset evidence only', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md',
])

for (const path of [
  'docs/PRODUCT_AUTHORITY_DELETED_DOCS_MANIFEST_2026_06_10.md',
  'docs/DOCS_READONLY_ARCHIVE_WHITELIST_2026_06_05.md',
]) {
  const text = read(path)
  for (const required of [
    'AI_BACKEND_RUNTIME_EXEC_PLAN_2026_04_19.md',
    'RESOURCE_CELL_ART_NEW_WINDOW_HANDOFF_2026_05_27.md',
    'SEA_OVERSEAS_NAVAL_BATTLE_REPORT_AND_UNIT_FRAME_PLAN_2026_06_07.md',
  ]) {
    assert.ok(text.includes(required), `${path} should record handoff / plan / prompt demotion batch 2 source ${required}`)
  }
}

assertStatus('docs/AI_PLAYER_AUDIT_REPORT.md', 'reference-only historical AI-player audit', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_AI_PLAYER_GOVERNANCE_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_AI_SOCIAL_GOVERNANCE_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

for (const [path, status] of [
  ['docs/AI_PLAYER_BYOK_BILLING_AUDIT_PLAYER_KEY_CONTRACT_2026_04_27.md', 'current-adjacent AI provider/BYOK evidence only'],
  ['docs/AI_PLAYER_PROVIDER_AGNOSTIC_VOICE_PLAN_2026_05_28.md', 'current-adjacent AI voice provider evidence only'],
  ['docs/AI_PLAYER_RESOURCE_TRANSFER_AUTHORITY_HANDOFF_2026_04_21.md', 'current-adjacent AI resource-transfer evidence only'],
] as const) {
  const text = read(path)
  assert.ok(text.includes(`2026-06-11 status: ${status}`), `${path} should have ${status} status header`)
  assert.ok(text.includes('PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md'), `${path} should route to product authority index`)
  assert.ok(text.includes('PRODUCT_AUTHORITY_AI_PLAYER_GOVERNANCE_CURRENT_2026_06_10.md'), `${path} should route to AI governance authority`)
}

assertStatus('docs/AI_PLAYER_MAP_VISUAL_EXPRESSION_DRAFT_2026_04_27.md', 'superseded AI map-visual draft', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_WORLD_MAP_SUBSTRATE_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md',
])

for (const path of [
  'docs/CORE_PLAYABLE_GAP_AUDIT_CURRENT_2026_06_08.md',
  'docs/SLG_AI_LIVING_WORLD_PLAYABLE_DEMO_BIG_PLAN_CURRENT_2026_06_06.md',
]) {
  const text = read(path)
  assert.ok(text.includes('2026-06-11 status: current-lane playable'), `${path} should be constrained to current-lane playable evidence`)
  assert.ok(text.includes('PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md'), `${path} should route to product authority index`)
}

assertStatus('docs/GENERAL_SKILL_LIBRARY_NATIVE_UI_HANDOFF_2026_04_26.md', 'current-adjacent general-skill UI evidence only', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_COMBAT_WAR_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

for (const [path, status] of [
  ['docs/MAINLINE_UI_PORTRAIT_ASSET_CROP_AUDIT_2026_05_26.md', 'current-adjacent frontend asset audit only'],
  ['docs/MAINLINE_UI_VISUAL_INVESTOR_RISK_AUDIT_2026_05_28.md', 'current-adjacent frontend visual-risk audit only'],
  ['docs/VISUAL_SCREENSHOT_ATLAS_HANDOFF_2026_06_05.md', 'current-adjacent visual screenshot evidence only'],
] as const) {
  assertStatus(path, status, [
    'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
    'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  ])
}

assertStatus('docs/NATION_ARCHIVE_GOVERNANCE_ACTIONS_HANDOFF_2026_06_01.md', 'current-adjacent nation-governance action evidence only', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_ORGANIZATION_NATION_LADDER_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_AI_SOCIAL_GOVERNANCE_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

for (const [path, status] of [
  ['docs/NATIVE_SLG_RESET_PLAN_2026_04_16.md', 'reference-only historical native-SLG reset plan'],
  ['docs/NATIVE_SLG_SHELL_HANDOFF_2026_04_20.md', 'reference-only historical native-shell handoff'],
] as const) {
  assertStatus(path, status, [
    'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
    'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
    'CURRENT_HANDOFF_INDEX_2026_06_05.md',
  ])
}

assertStatus('docs/NEW_MACHINE_AI_START_PROMPT_2026_04_17.md', 'superseded machine-start prompt archive', [
  'AGENTS_EXECUTION_CURRENT_2026_04.md',
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

assertStatus('docs/NEW_MACHINE_AI_PROMPT_TEMPLATE_2026_04_17.md', 'superseded machine-start prompt template archive', [
  'AGENTS_EXECUTION_CURRENT_2026_04.md',
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

assertStatus('docs/WORLD_CELL_LAYERED_BASE_BINDING_EXECUTION_PLAN_2026_04_23.md', 'current-adjacent world-cell execution evidence only', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_WORLD_MAP_SUBSTRATE_CURRENT_2026_06_11.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

assertStatus('docs/WORLD_RESOURCE_GENERATION_AUTHORITY_HANDOFF_2026_04_22.md', 'current-adjacent world-resource generation evidence only', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_WORLD_MAP_SUBSTRATE_CURRENT_2026_06_11.md',
  'RESOURCE_TILE_ECONOMY_AUTHORITY_CURRENT_2026_06_08.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

for (const [path, status] of [
  ['docs/archive/HANDOFF_2026_03_17_EDITOR_SESSION.md', 'archive-only historical editor handoff'],
  ['docs/archive/HANDOFF_2026_03_18.md', 'archive-only historical handoff'],
  ['docs/archive/HANDOFF_2026_03_19.md', 'archive-only historical handoff'],
  ['docs/archive/HANDOFF_STZB_REVERSE_COMPLETE.md', 'archive-only historical reverse-engineering reference'],
  ['docs/archive/modules_legacy_2026_03_25/MODULE_HANDOFF_TEMPLATE.md', 'archive-only historical module handoff template'],
] as const) {
  assertStatus(path, status, [
    'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
    'CURRENT_HANDOFF_INDEX_2026_06_05.md',
  ])
}

assertStatus('docs/archive/modules_legacy_2026_03_25/MOD-02_commander-planning.md', 'stale-only legacy module card', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_AI_PLAYER_GOVERNANCE_CURRENT_2026_06_10.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

assertStatus('docs/templates/cross-ai-audit-skel.md', 'reference-only audit template', [
  'AGENTS_EXECUTION_CURRENT_2026_04.md',
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

assertStatus('docs/templates/GENERAL_PROFILE_ROSTER_DRAFT_27.md', 'reference-only general profile draft', [
  'PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_COMBAT_WAR_CURRENT_2026_06_10.md',
  'PRODUCT_AUTHORITY_FRONTEND_UI_ART_CURRENT_2026_06_11.md',
  'CURRENT_HANDOFF_INDEX_2026_06_05.md',
])

for (const path of [
  'docs/superpowers/plans/2026-06-01-alliance-officer-authority-table-and-nation-governance-ui.md',
  'docs/superpowers/plans/2026-06-01-main-world-frontline-authority-tool.md',
  'docs/superpowers/plans/2026-06-01-nation-empire-upgrade-formal-action.md',
  'docs/superpowers/plans/2026-06-01-session-officer-nation-governance-gameplay-frontline.md',
  'docs/superpowers/plans/2026-06-01-tianxia-frontline-and-nation-submit.md',
  'docs/superpowers/plans/2026-06-01-tianxia-frontline-render-and-nation-profile-actions.md',
  'docs/superpowers/plans/2026-06-03-drill-ground-layer-polish.md',
  'docs/superpowers/plans/2026-06-04-tianxia-yutu-productization.md',
  'docs/superpowers/plans/2026-06-05-combat-provider-voice-soak-stable-facts.md',
  'docs/superpowers/plans/2026-06-05-mainline-ui-button-governance-stable-pages.md',
  'docs/superpowers/plans/2026-06-08-main-event-hud-ai-activity-art-bible.md',
  'docs/superpowers/plans/2026-06-08-nation-organization-midgame-playable-chain.md',
]) {
  const text = read(path)
  assert.ok(
    text.includes('2026-06-11 status: reference-only implementation plan archive.'),
    `${path} should be reference-only implementation plan archive`,
  )
  assert.ok(text.includes('PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md'), `${path} should route to product authority index`)
  assert.ok(text.includes('CURRENT_HANDOFF_INDEX_2026_06_05.md'), `${path} should route to CURRENT handoff`)
}

for (const path of [
  'docs/PRODUCT_AUTHORITY_DELETED_DOCS_MANIFEST_2026_06_10.md',
  'docs/DOCS_READONLY_ARCHIVE_WHITELIST_2026_06_05.md',
]) {
  const text = read(path)
  for (const required of [
    'ACCEPTANCE_NIGHTLY_2026_03_27_0030.md',
    'ACCEPTANCE_NIGHTLY_2026_03_27_0105.md',
    'CLOSEOUT_B2_C16_C17_2026_04_10.md',
    'CLOSEOUT_P4_AI_PLAYER_ANIMATION_2026_04_12.md',
    'CLOSEOUT_P5_DOCS_PR_PACKAGE_2026_04_12.md',
    'CODE_SPLIT_EXEC_ACCEPTANCE_M01_M18_2026_03_26.md',
    'ASSET_MANIFEST_GOVERNANCE_2026_04_28.md',
    'RESOURCE_CELL_ART_FAILURE_LEDGER_2026_05_26.md',
    'WORLD_CELL_PHASE2_MAP_GRID_REVIEW_2026_04_25.md',
    'SUBAGENT_ASSET_AUDIT_2026_04_11.md',
    'AI_PLAYER_ATOMIC_ACTION_CATALOG_V1_2026_04_20.md',
    'AI_PLAYER_BACKEND_TASK_PACKAGES_2026_05_22.md',
    'AI_PLAYER_PROVIDER_ACCOUNTING_AND_AI_COMMAND_CREDITS_2026_05_21.md',
    'AI_BACKEND_RUNTIME_CONTRACT_2026_04_19.md',
    'MAINLINE_UI_PAGE_CACHE_INDEX_2026_05_20.md',
    'MAIN_CITY_FACILITY_TREE_READ_MODEL_CONTRACT_2026_05_24.md',
    'MAP_UNIT_VISUAL_ASSET_SPEC_2026_06_01.md',
    'TASK_2026_04_14_PRODUCT_FRONTEND_EXEC_CARDS.md',
    'MOD-15_frontend-map-rendering.md',
    'AI_PLAYER_AUTONOMOUS_DEVELOPMENT_CURRENT_2026_06_02.md',
    'SEA_OVERSEAS_NAVAL_PATROL_INTERCEPT_SLICE_CURRENT_2026_06_07.md',
    'WORLD_RESOURCE_SEASON_CUTOVER_OPS_2026_04_22.md',
    'WORLD_RESOURCE_WORKSTREAM_SPLIT_2026_04_22.md',
    'AI_PLAYER_AUDIT_REPORT.md',
    'SLG_AI_LIVING_WORLD_PLAYABLE_DEMO_BIG_PLAN_CURRENT_2026_06_06.md',
    'WORLD_RESOURCE_GENERATION_AUTHORITY_HANDOFF_2026_04_22.md',
    'HANDOFF_STZB_REVERSE_COMPLETE.md',
    'NEW_MACHINE_AI_PROMPT_TEMPLATE_2026_04_17.md',
    'HANDOFF_2026_03_18.md',
    'MOD-02_commander-planning.md',
    'docs/superpowers/plans/2026-06-01-alliance-officer-authority-table-and-nation-governance-ui.md',
    'docs/superpowers/plans/2026-06-08-nation-organization-midgame-playable-chain.md',
  ]) {
    assert.ok(text.includes(required), `${path} should record handoff / plan / prompt / audit / implementation-plan demotion source ${required}`)
  }
}

console.log('[old_ops_debug_entrypoint_demotions_contract] all checks passed')
