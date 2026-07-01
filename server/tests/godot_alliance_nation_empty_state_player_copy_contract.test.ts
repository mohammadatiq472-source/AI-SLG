import assert from 'node:assert'
import { readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function extractFunctionSource(source: string, functionName: string): string {
  const start = source.indexOf(`func ${functionName}(`)
  assert.ok(start >= 0, `${functionName} must exist.`)
  const end = source.indexOf('\nfunc ', start + 1)
  return source.slice(start, end > start ? end : source.length)
}

function extractStringLiterals(source: string): string[] {
  const literals: string[] = []
  const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/g
  for (const match of source.matchAll(pattern)) {
    literals.push(match[1] ?? match[2] ?? '')
  }
  return literals
}

const presenter = readUtf8('godot-client/scripts/ui/presenters/alliance_presenter.gd')
const panel = readUtf8('godot-client/scripts/ui/alliance_panel.gd')
const organizationFixture = readUtf8('godot-client/data/ui/organization_lifecycle_preview_read_model.json')
const diplomacyFixtureStart = organizationFixture.indexOf('"diplomacy": {')
const diplomacyFixtureEnd = organizationFixture.indexOf('"friendly_relation_count"', diplomacyFixtureStart)
assert.ok(diplomacyFixtureStart >= 0 && diplomacyFixtureEnd > diplomacyFixtureStart, 'organization diplomacy fixture section must be extractable.')
const diplomacyFixtureSource = organizationFixture.slice(diplomacyFixtureStart, diplomacyFixtureEnd)

assert.ok(
  presenter.includes('ORGANIZATION_EMPTY_STATE_PLAYER_COPY_CONTRACT := "organization_empty_state_player_copy_v1"'),
  'AlliancePresenter must declare the focused organization empty-state player-copy contract.',
)

for (const requiredPanelCopy of [
  '暂无组织内容',
  '组织内容暂未送达。',
  '暂无组织日志',
  '组织日志暂未送达。',
  '待展开',
]) {
  assert.ok(panel.includes(requiredPanelCopy), `AlliancePanel must keep player-facing empty copy: ${requiredPanelCopy}`)
}

for (const requiredPresenterCopy of [
  '暂未建立外交往来。',
  '申请待审页先展示容量、指挥席和支援缺口。',
  '战报、回放、战斗记录和外交协议并列展示。',
  '外交协定、执行回放和战报并列展示。',
  '国家目标暂未送达。',
  '玩家成员',
  '势力成员',
  '官职席',
]) {
  assert.ok(
    presenter.includes(requiredPresenterCopy),
    `AlliancePresenter must keep player-facing organization copy: ${requiredPresenterCopy}`,
  )
}

const presenterVisibleFunctions = [
  '_build_diplomacy_section',
  '_build_backend_ai_rally_campaign_cards',
  '_build_organization_battle_report_section',
  '_build_report_archive_section',
  '_build_applications_pending_section',
  '_build_applications_review_section',
  '_build_applications_history_section',
  '_build_nation_midgame_player_ui_copy',
  '_build_nation_midgame_player_stage_cards',
  '_build_nation_midgame_player_member_cards',
  '_build_nation_midgame_objective_rows',
  '_build_membership_authority_cards',
]

const panelVisibleFunctions = [
  '_build_secondary_stage_empty_card',
  '_build_war_room_drilldown_controls',
]

const visibleStrings = [
  ...presenterVisibleFunctions.flatMap((name) => extractStringLiterals(extractFunctionSource(presenter, name))),
  ...panelVisibleFunctions.flatMap((name) => extractStringLiterals(extractFunctionSource(panel, name))),
  ...extractStringLiterals(diplomacyFixtureSource),
].filter((literal) => !/^[A-Za-z0-9_]+(Block|Panel|Button|Row|Label)$/.test(literal))
  .filter((literal) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(literal))

const forbiddenVisibleFragments = [
  'read model',
  'backend',
  'contract id',
  'contract_id',
  'fixture',
  'local_only',
  'snake_case',
  '/api/',
  'nation tier',
  'organization kind',
  'alliance -> kingdom -> empire',
  '结构位',
  '补骨架',
  'session_player',
  'world_faction_ai_players',
  'alliance_officer_authority_table',
  'read_model_missing',
  'nation_war_objective_read_model_v1',
  '后端',
]

for (const literal of visibleStrings) {
  for (const forbidden of forbiddenVisibleFragments) {
    assert.ok(
      !literal.toLowerCase().includes(forbidden.toLowerCase()),
      `player-visible organization empty copy must not expose "${forbidden}" in "${literal}"`,
    )
  }
}

assert.ok(
  presenter.includes('NATION_MIDGAME_PLAYER_UI_COPY_CONTRACT := "nation_midgame_player_ui_copy_v1"'),
  'The focused empty-state contract must preserve the nation-midgame player-copy contract.',
)

assert.ok(
  presenter.includes('NATION_MIDGAME_FRONTEND_SKELETON_CONTRACT := "nation_midgame_frontend_skeleton_v1"'),
  'The focused empty-state contract must preserve the nation-midgame skeleton contract.',
)

console.log('[godot_alliance_nation_empty_state_player_copy_contract] all checks passed')
